import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Sparkles, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: program.followUpQuestion || 'Ditt program är klart! Vill du göra några justeringar? Du kan be mig lägga till supersets, ändra övningar, justera sets/reps, eller något annat.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        // Program was updated
        onProgramUpdate(data.program);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `✅ ${data.changes || 'Programmet har uppdaterats!'}\n\nVill du göra fler ändringar?`
        }]);
      } else {
        // Just a message response
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gym-orange" />
            Finjustera ditt program
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 mt-4">
          <Input
            placeholder="Skriv dina önskemål..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex justify-between mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button variant="hero" onClick={handleComplete}>
            <Check className="w-4 h-4 mr-2" />
            Klar - Spara program
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
