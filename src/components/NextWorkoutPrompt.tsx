import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, CalendarCheck, PartyPopper } from 'lucide-react';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface NextWorkoutPromptProps {
  /** Number of workouts the user has logged in total. */
  logCount: number;
}

const OPTIONS = [
  { days: 1, label: 'Imorgon' },
  { days: 2, label: 'Om 2 dagar' },
  { days: 3, label: 'Om 3 dagar' },
];

export default function NextWorkoutPrompt({ logCount }: NextWorkoutPromptProps) {
  const { user } = useAuth();
  const { isSupported, isSubscribed, subscribe } = usePushNotifications();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'schedule' | 'push'>('schedule');
  const [saving, setSaving] = useState(false);

  const storageKey = user ? `next_workout_prompt_${user.id}` : null;

  useEffect(() => {
    const check = async () => {
      if (!user || !storageKey || logCount < 1) return;
      if (localStorage.getItem(storageKey)) return;

      const { data } = await supabase
        .from('scheduled_workouts')
        .select('id')
        .eq('user_id', user.id)
        .gte('scheduled_date', format(new Date(), 'yyyy-MM-dd'))
        .limit(1);

      if ((data?.length ?? 0) === 0) {
        setOpen(true);
      } else {
        localStorage.setItem(storageKey, 'done');
      }
    };
    check();
  }, [user, logCount, storageKey]);

  const dismiss = () => {
    if (storageKey) localStorage.setItem(storageKey, 'done');
    setOpen(false);
  };

  const handleSchedule = async (days: number) => {
    if (!user) return;
    setSaving(true);
    const date = addDays(new Date(), days);
    const { error } = await supabase.from('scheduled_workouts').insert({
      user_id: user.id,
      scheduled_date: format(date, 'yyyy-MM-dd'),
      scheduled_time: '18:00',
      title: 'Träningspass',
      workout_type: 'strength',
      reminder_enabled: true,
      reminder_minutes_before: 60,
    });
    setSaving(false);

    if (error) {
      console.error('Error scheduling workout:', error);
      toast.error('Kunde inte schemalägga passet. Försök igen.');
      return;
    }

    toast.success(`Inbokat ${format(date, 'EEEE d MMMM', { locale: sv })} kl 18:00`);

    if (isSupported && !isSubscribed) {
      setStep('push');
    } else {
      dismiss();
    }
  };

  const handleEnablePush = async () => {
    setSaving(true);
    const success = await subscribe();
    setSaving(false);
    if (success) {
      toast.success('Påminnelser aktiverade!');
    }
    dismiss();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <DialogContent className="max-w-md">
        {step === 'schedule' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PartyPopper className="w-5 h-5 text-primary" />
                Snyggt jobbat!
              </DialogTitle>
              <DialogDescription>
                Passet är loggat. När tränar du nästa gång? Vi bokar in det och påminner dig.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {OPTIONS.map((option) => (
                <Button
                  key={option.days}
                  variant="outline"
                  disabled={saving}
                  className="justify-start gap-2 h-12"
                  onClick={() => handleSchedule(option.days)}
                >
                  <CalendarCheck className="w-4 h-4 text-primary" />
                  <span className="font-medium">{option.label}</span>
                  <span className="text-muted-foreground text-xs ml-auto">
                    {format(addDays(new Date(), option.days), 'EEEE d MMM', { locale: sv })}
                  </span>
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={dismiss} disabled={saving}>
              Inte nu
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Vill du bli påmind?
              </DialogTitle>
              <DialogDescription>
                Vi skickar en notis en timme innan passet så att du inte missar det.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Button onClick={handleEnablePush} disabled={saving} className="gap-2">
                <Bell className="w-4 h-4" />
                Aktivera påminnelser
              </Button>
              <Button variant="ghost" size="sm" onClick={dismiss} disabled={saving}>
                Nej tack
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
