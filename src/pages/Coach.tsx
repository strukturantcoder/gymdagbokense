import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function Coach() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadConversation();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("coach_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setConversationId(data.id);
      setMessages((data.messages as unknown as Message[]) || []);
    }
  };

  const fetchUserContext = async () => {
    if (!user) return "";
    const [statsRes, workoutsRes, goalsRes] = await Promise.all([
      supabase.from("user_stats").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("workout_logs").select("workout_day, completed_at, duration_minutes").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(5),
      supabase.from("user_goals").select("title, goal_type, current_value, target_value, status").eq("user_id", user.id).eq("status", "active").limit(5),
    ]);
    return `Användarens statistik: ${JSON.stringify(statsRes.data || {})}
Senaste 5 pass: ${JSON.stringify(workoutsRes.data || [])}
Aktiva mål: ${JSON.stringify(goalsRes.data || [])}`;
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || loading) return;

    const userMsg: Message = { role: "user", content: input.trim(), timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const context = await fetchUserContext();

      const { data, error } = await supabase.functions.invoke("analyze-training", {
        body: {
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          systemPrompt: `Du är en personlig AI-tränare för Gymdagboken-appen. Svara alltid på svenska.
Du har tillgång till användarens träningsdata:
${context}

Var uppmuntrande, konkret och ge praktiska råd. Håll svaren korta och relevanta.
Om användaren frågar om kost, ge generella råd men nämn att de kan använda Kostspårningen i appen.
Om du inte vet svaret, var ärlig om det.`,
        },
      });
      if (error) throw error;

      const assistantContent = data?.analysis || data?.choices?.[0]?.message?.content || "Jag kunde inte svara just nu, försök igen!";
      const assistantMsg: Message = {
        role: "assistant",
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };
      const allMessages = [...updatedMessages, assistantMsg];
      setMessages(allMessages);

      // Save conversation
      if (conversationId) {
        await supabase.from("coach_conversations").update({
          messages: allMessages as unknown as any,
          updated_at: new Date().toISOString(),
        }).eq("id", conversationId);
      } else {
        const { data: newConv } = await supabase.from("coach_conversations").insert({
          user_id: user.id,
          messages: allMessages as unknown as any,
        }).select("id").single();
        if (newConv) setConversationId(newConv.id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Kunde inte skicka meddelande");
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  return (
    <>
      <Helmet>
        <title>AI Coach | Gymdagboken</title>
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gym-orange to-amber-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold">AI Coach</p>
              <p className="text-xs text-muted-foreground">Din personliga tränare</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={startNewConversation}>
            <Sparkles className="w-4 h-4 mr-1" /> Ny chatt
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-semibold">Hej! 👋</p>
              <p className="text-sm text-muted-foreground mt-1">
                Jag är din AI-tränare. Fråga mig om träning, teknik, eller få personliga tips baserat på din träningshistorik.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {["Hur ser min träning ut?", "Tips för bänkpress", "Hur ofta ska jag träna?"].map((q) => (
                  <Button key={q} variant="outline" size="sm" onClick={() => { setInput(q); }}>
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gym-orange to-amber-500 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gym-orange to-amber-500 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-sm">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex gap-2"
          >
            <Input
              placeholder="Skriv till din coach..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
