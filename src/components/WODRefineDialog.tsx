import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Sparkles, Check, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface WODExercise {
  name: string;
  reps: string;
}

interface WOD {
  id?: string;
  name: string;
  format: string;
  duration: string;
  exercises: WODExercise[];
  description: string;
  scaling: string;
}

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface WODRefineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wod: WOD;
  onWodUpdate: (wod: WOD) => void;
  onComplete: () => void;
}

export default function WODRefineDialog({
  open,
  onOpenChange,
  wod,
  onWodUpdate,
  onComplete
}: WODRefineDialogProps) {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Din WOD är klar! Vill du göra några ändringar? Du kan be mig:\n• Byta ut övningar\n• Ändra antal reps eller tid\n• Göra den lättare/svårare\n• Lägga till eller ta bort övningar'
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
      const { data, error } = await supabase.functions.invoke('refine-wod', {
        body: { currentWod: wod, userMessage }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      if (data.type === 'wod') {
        onWodUpdate(data.wod);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `✅ ${data.changes || 'WOD uppdaterad!'}\n\nVill du göra fler ändringar?`
        }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.content || 'Vill du göra några andra ändringar?'
        }]);
      }
    } catch (error) {
      console.error('Error refining WOD:', error);
      toast.error('Kunde inte bearbeta din förfrågan');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Tyvärr uppstod ett fel. Försök igen eller klicka på "Klar" för att använda WOD som den är.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete();
    onOpenChange(false);
  };

  const content = (
    <>
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

      <div className="flex justify-between mt-4">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Avbryt
        </Button>
        <Button variant="default" onClick={handleComplete}>
          <Check className="w-4 h-4 mr-2" />
          Klar
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-6">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Finjustera din WOD
            </DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Finjustera din WOD
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
