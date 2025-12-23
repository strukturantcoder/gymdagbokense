import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Sparkles, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProgramData {
  name: string;
  description: string;
  weeks: number;
  days: any[];
  followUpQuestion?: string;
}

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface ProgramRefineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: ProgramData;
  onProgramUpdate: (program: ProgramData) => void;
  onComplete: () => void;
}

export default function ProgramRefineDialog({
  open,
  onOpenChange,
  program,
  onProgramUpdate,
  onComplete
}: ProgramRefineDialogProps) {
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: program.followUpQuestion || 'Ditt program är klart! Vill du göra några justeringar?\n\n💡 Tips: Du kan be mig:\n• Lägga till fler träningsdagar\n• Ändra övningar\n• Lägga till supersets\n• Justera sets/reps\n• Och mycket mer!'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('refine-workout', {
        body: { currentProgram: program, userMessage }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.type === 'program') {
        onProgramUpdate(data.program);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `✅ ${data.changes || 'Programmet har uppdaterats!'}\n\nVill du göra fler ändringar?`
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.content || 'Jag förstår. Vill du göra några andra ändringar?'
        }]);
      }
    } catch (error) {
      console.error('Error refining program:', error);
      toast.error('Kunde inte bearbeta din förfrågan');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Tyvärr uppstod ett fel. Försök igen eller klicka på "Klar" för att spara programmet som det är.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete();
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Messages area - takes remaining space */}
      <div className="flex-1 overflow-y-auto min-h-0 mb-4">
        <div className="space-y-3 pr-2">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Bearbetar...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area - fixed at bottom */}
      <div className="flex-shrink-0 border-t border-border pt-4 space-y-3">
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder="Skriv dina önskemål här... (Enter för att skicka)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="min-h-[60px] max-h-[120px] resize-none"
            rows={2}
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()}
            size="icon"
            className="h-[60px] w-[60px] flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex justify-between gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
            Avbryt
          </Button>
          <Button variant="hero" onClick={handleComplete} className="flex-1">
            <Check className="w-4 h-4 mr-2" />
            Klar - Spara
          </Button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85vh] max-h-[85vh]">
          <DrawerHeader className="text-left px-4 pb-2 flex-shrink-0">
            <DrawerTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gym-orange" />
              Finjustera ditt program
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 min-h-0 px-4 pb-4">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg h-[70vh] max-h-[600px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gym-orange" />
            Finjustera ditt program
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
