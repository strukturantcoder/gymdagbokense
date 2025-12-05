import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePoolChallenges, PoolMessage, PoolChallenge } from '@/hooks/usePoolChallenges';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface PoolChallengeChatProps {
  challenge: PoolChallenge;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PoolChallengeChat({ challenge, open, onOpenChange }: PoolChallengeChatProps) {
  const { user } = useAuth();
  const { sendMessage, getMessages } = usePoolChallenges();
  const [messages, setMessages] = useState<PoolMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      loadMessages();
    }
  }, [open, challenge.id]);

  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel(`pool-chat-${challenge.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pool_challenge_messages',
          filter: `challenge_id=eq.${challenge.id}`
        },
        async (payload) => {
          // Fetch the profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', payload.new.user_id)
            .single();

          const newMsg: PoolMessage = {
            ...payload.new as any,
            profile
          };

          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, challenge.id]);

  const loadMessages = async () => {
    setLoading(true);
    const msgs = await getMessages(challenge.id);
    setMessages(msgs);
    setLoading(false);
    setTimeout(scrollToBottom, 100);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(challenge.id, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const content = (
    <div className="flex flex-col h-[60vh]">
      {/* Participants */}
      <div className="flex items-center gap-2 pb-4 border-b">
        {challenge.participants?.map((p) => (
          <div key={p.id} className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={p.profile?.avatar_url || undefined} />
              <AvatarFallback>
                {p.profile?.display_name?.slice(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {p.profile?.display_name || 'Anonym'}
              {p.user_id === user?.id && ' (du)'}
            </span>
          </div>
        ))}
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p>Inga meddelanden än</p>
            <p className="text-sm">Starta konversationen!</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-4 px-1">
              {messages.map((msg, index) => {
                const isMe = msg.user_id === user?.id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={msg.profile?.avatar_url || undefined} />
                      <AvatarFallback className={isMe ? 'bg-primary text-primary-foreground' : ''}>
                        {msg.profile?.display_name?.slice(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-secondary rounded-tl-sm'
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                      </div>
                      <p className={`text-xs text-muted-foreground mt-1 ${isMe ? 'text-right' : ''}`}>
                        {format(new Date(msg.created_at), 'HH:mm', { locale: sv })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="flex gap-2 pt-4 border-t">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Skriv ett meddelande..."
          disabled={sending}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={!newMessage.trim() || sending} size="icon">
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Utmaningschatt</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Utmaningschatt</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
