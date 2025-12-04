import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';

export function PushNotificationSettings() {
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushNotifications();

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

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card">
      {isSubscribed ? (
        <Bell className="w-4 h-4 text-primary" />
      ) : (
        <BellOff className="w-4 h-4 text-muted-foreground" />
      )}
      <Label htmlFor="push-notifications" className="flex-1 text-sm cursor-pointer">
        Push-notiser
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
  );
}
