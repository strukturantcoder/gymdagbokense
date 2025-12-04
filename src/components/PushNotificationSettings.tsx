import { Bell, BellOff, Loader2, Send } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

export function PushNotificationSettings() {
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushNotifications();
  const { user } = useAuth();
  const [isSendingTest, setIsSendingTest] = useState(false);

  if (!isSupported) {
    return null;
  }

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      const success = await subscribe();
      if (success) {
        toast.success('Push-notifikationer aktiverade!');
      } else if (permission === 'denied') {
        toast.error('Push-notifikationer blockerade i webbläsaren. Ändra i webbläsarens inställningar.');
      } else {
        toast.error('Kunde inte aktivera push-notifikationer');
      }
    } else {
      const success = await unsubscribe();
      if (success) {
        toast.success('Push-notifikationer avaktiverade');
      } else {
        toast.error('Kunde inte avaktivera push-notifikationer');
      }
    }
  };

  const sendTestNotification = async () => {
    if (!user) return;
    
    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          title: 'Test från Gymdagboken 💪',
          message: 'Push-notifikationer fungerar!',
          url: '/dashboard'
        }
      });

      if (error) throw error;
      
      if (data?.sent > 0) {
        toast.success('Test-notifikation skickad!');
      } else {
        toast.error('Ingen prenumeration hittades. Aktivera push först.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Kunde inte skicka test-notifikation');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card">
        {isSubscribed ? (
          <Bell className="w-4 h-4 text-primary" />
        ) : (
          <BellOff className="w-4 h-4 text-muted-foreground" />
        )}
        <Label htmlFor="push-notifications" className="text-sm cursor-pointer">
          Push
        </Label>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={permission === 'denied'}
          />
        )}
      </div>
      {isSubscribed && (
        <Button
          variant="outline"
          size="sm"
          onClick={sendTestNotification}
          disabled={isSendingTest}
          className="h-9"
        >
          {isSendingTest ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );
}