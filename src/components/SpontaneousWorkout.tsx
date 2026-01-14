import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  Send, 
  Dumbbell, 
  Clock, 
  RefreshCcw, 
  Play, 
  X, 
  Loader2,
  ThumbsUp,
  ThumbsDown,
  BookmarkPlus,
  MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
  supersetGroup?: number | null;
}

interface GeneratedWorkout {
  name: string;
  focus: string;
  estimatedDuration: number;
  exercises: Exercise[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  workout?: GeneratedWorkout;
}

interface SpontaneousWorkoutProps {
  onClose: () => void;
  onStartWorkout: (workout: GeneratedWorkout) => void;
}

const EXAMPLE_PROMPTS = [
  "Jag vill träna bröst och axlar idag",
  "Snabbt benpass på 30 min",
  "Träna rygg med fokus på marklyft",
  "Helkroppspass för nybörjare",
  "Armträning med supersets"
];

export default function SpontaneousWorkout({ onClose, onStartWorkout }: SpontaneousWorkoutProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hej! 👋 Vad vill du träna idag? Berätta vad du är sugen på så sätter jag ihop ett pass åt dig!"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentWorkout, setCurrentWorkout] = useState<GeneratedWorkout | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.workout 
          ? `${m.content}\n\n[Genererat pass: ${m.workout.name}]`
          : m.content
      }));

      const { data, error } = await supabase.functions.invoke("generate-spontaneous-workout", {
        body: { 
          userInput: text,
          conversationHistory
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || data.content || "Här är ditt pass!",
        workout: data.workout
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (data.workout) {
        setCurrentWorkout(data.workout);
      }
    } catch (error) {
      console.error("Error generating workout:", error);
      toast.error("Kunde inte generera pass. Försök igen!");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Oj, något gick fel! Kan du beskriva vad du vill träna igen?"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWorkout = () => {
    if (currentWorkout) {
      onStartWorkout(currentWorkout);
      onClose();
    }
  };

  const handleFeedback = async (liked: boolean) => {
    if (liked) {
      toast.success("Kul att du gillade passet! 💪");
      setShowFeedback(false);
      // Could save feedback to database here
    } else {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Vad skulle du vilja ändra på? Berätta så justerar jag passet!"
      }]);
      setShowFeedback(false);
    }
  };

  const handleCreateProgram = () => {
    if (currentWorkout) {
      // Navigate to training with the workout data
      navigate("/training", { 
        state: { 
          createProgramFrom: currentWorkout 
        } 
      });
      onClose();
    }
  };

  const groupExercisesBySupersets = (exercises: Exercise[]) => {
    const groups: { superset: boolean; exercises: Exercise[] }[] = [];
    let currentGroup: Exercise[] = [];
    let currentSupersetId: number | null = null;

    exercises.forEach((exercise, index) => {
      if (exercise.supersetGroup !== null && exercise.supersetGroup !== undefined) {
        if (currentSupersetId === exercise.supersetGroup) {
          currentGroup.push(exercise);
        } else {
          if (currentGroup.length > 0) {
            groups.push({ superset: currentSupersetId !== null, exercises: currentGroup });
          }
          currentGroup = [exercise];
          currentSupersetId = exercise.supersetGroup;
        }
      } else {
        if (currentGroup.length > 0) {
          groups.push({ superset: currentSupersetId !== null, exercises: currentGroup });
        }
        groups.push({ superset: false, exercises: [exercise] });
        currentGroup = [];
        currentSupersetId = null;
      }

      if (index === exercises.length - 1 && currentGroup.length > 0) {
        groups.push({ superset: currentSupersetId !== null, exercises: currentGroup });
      }
    });

    return groups;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 top-16 bg-background rounded-t-3xl shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gym-orange to-amber-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold">Spontan-pass</h2>
              <p className="text-xs text-muted-foreground">Din AI-tränare</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4 pb-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] ${message.role === "user" ? "order-1" : ""}`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.role === "user" 
                        ? "bg-primary text-primary-foreground ml-auto" 
                        : "bg-muted"
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    
                    {/* Workout Card */}
                    {message.workout && (
                      <Card className="mt-3 border-primary/20 overflow-hidden">
                        <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 to-transparent">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-base">{message.workout.name}</CardTitle>
                              <p className="text-xs text-muted-foreground">{message.workout.focus}</p>
                            </div>
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="w-3 h-3" />
                              ~{message.workout.estimatedDuration} min
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-3">
                          <div className="space-y-2">
                            {groupExercisesBySupersets(message.workout.exercises).map((group, groupIndex) => (
                              <div 
                                key={groupIndex} 
                                className={group.superset ? "pl-3 border-l-2 border-gym-orange space-y-2" : ""}
                              >
                                {group.superset && (
                                  <Badge variant="outline" className="text-[10px] mb-1 border-gym-orange/50 text-gym-orange">
                                    Superset
                                  </Badge>
                                )}
                                {group.exercises.map((exercise, exIndex) => (
                                  <div 
                                    key={exIndex} 
                                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Dumbbell className="w-4 h-4 text-primary" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">{exercise.name}</p>
                                        {exercise.notes && (
                                          <p className="text-[10px] text-muted-foreground">{exercise.notes}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-semibold">{exercise.sets} × {exercise.reps}</p>
                                      <p className="text-[10px] text-muted-foreground">{exercise.rest} vila</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>

                          {/* Action buttons */}
                          <div className="flex gap-2 mt-4">
                            <Button 
                              variant="hero" 
                              className="flex-1 gap-2"
                              onClick={handleStartWorkout}
                            >
                              <Play className="w-4 h-4" />
                              Starta passet
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleSend("Kan du justera passet lite?")}
                            >
                              <RefreshCcw className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Tänker...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Example prompts for new users */}
          {messages.length === 1 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Förslag:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => handleSend(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback section after workout */}
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-muted rounded-xl"
            >
              <p className="text-sm font-medium mb-3">Hur var passet?</p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={() => handleFeedback(true)}
                >
                  <ThumbsUp className="w-4 h-4" />
                  Bra!
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 gap-2"
                  onClick={() => handleFeedback(false)}
                >
                  <ThumbsDown className="w-4 h-4" />
                  Kunde varit bättre
                </Button>
              </div>
              <Button 
                variant="secondary" 
                className="w-full mt-3 gap-2"
                onClick={handleCreateProgram}
              >
                <BookmarkPlus className="w-4 h-4" />
                Skapa program från detta pass
              </Button>
            </motion.div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t bg-background">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Beskriv vad du vill träna..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!input.trim() || isLoading}
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
