import { Challenge } from '@/hooks/useSocial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Timer, Dumbbell, Target, Check, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ChallengeCardProps {
  challenge: Challenge;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
}

const challengeTypeLabels = {
  workouts: 'Träningspass',
  sets: 'Sets',
  minutes: 'Minuter'
};

const challengeTypeIcons = {
  workouts: Dumbbell,
  sets: Target,
  minutes: Timer
};

export default function ChallengeCard({ challenge, onAccept, onDecline, onCancel }: ChallengeCardProps) {
  const { user } = useAuth();
  const isChallenger = challenge.challenger_id === user?.id;
  const opponent = isChallenger ? challenge.challenged_profile : challenge.challenger_profile;
  const myProgress = challenge.my_progress || 0;
  const opponentProgress = challenge.opponent_progress || 0;
  const Icon = challengeTypeIcons[challenge.challenge_type];
  
  const isPending = challenge.status === 'pending';
  const isActive = challenge.status === 'active';
  const isCompleted = challenge.status === 'completed';
  const isDeclined = challenge.status === 'declined';
  const canRespond = isPending && !isChallenger;
  const canCancel = (isPending || isActive) && onCancel;
  
  const daysLeft = Math.max(0, Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  
  const getStatusBadge = () => {
    if (isPending) return <Badge variant="secondary">Väntar på svar</Badge>;
    if (isActive) return <Badge className="bg-green-500">Aktiv</Badge>;
    if (isCompleted) {
      if (challenge.winner_id === user?.id) return <Badge className="bg-gym-orange">Du vann!</Badge>;
      if (challenge.winner_id) return <Badge variant="destructive">Du förlorade</Badge>;
      return <Badge variant="secondary">Oavgjort</Badge>;
    }
    return <Badge variant="destructive">Avvisad</Badge>;
  };

  return (
    <Card className={`${isActive ? 'border-primary/50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={opponent?.avatar_url || undefined} />
              <AvatarFallback>
                {opponent?.display_name?.slice(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">
                {isChallenger ? 'Du utmanade' : 'Utmanad av'} {opponent?.display_name || 'Anonym'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {format(new Date(challenge.created_at), 'd MMM yyyy', { locale: sv })}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Icon className="w-4 h-4 text-gym-orange" />
          <span className="font-medium">{challengeTypeLabels[challenge.challenge_type]}</span>
          <span className="text-muted-foreground">• Mål: {challenge.target_value}</span>
          {isActive && <span className="text-muted-foreground">• {daysLeft} dagar kvar</span>}
        </div>
        
        {(isActive || isCompleted) && (
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Du</span>
                <span>{myProgress} / {challenge.target_value}</span>
              </div>
              <Progress value={(myProgress / challenge.target_value) * 100} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>{opponent?.display_name || 'Motståndare'}</span>
                <span>{opponentProgress} / {challenge.target_value}</span>
              </div>
              <Progress value={(opponentProgress / challenge.target_value) * 100} className="h-2" />
            </div>
          </div>
        )}
        
        {canRespond && (
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="hero" onClick={onAccept}>
              <Check className="w-4 h-4 mr-2" />
              Acceptera
            </Button>
            <Button size="sm" variant="outline" onClick={onDecline}>
              <X className="w-4 h-4 mr-2" />
              Avvisa
            </Button>
          </div>
        )}
        
        {canCancel && (
          <div className="flex justify-end pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Avbryt utmaning
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Avbryt utmaning?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Är du säker på att du vill avbryta denna utmaning? Detta kan inte ångras.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Nej, behåll</AlertDialogCancel>
                  <AlertDialogAction onClick={onCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Ja, avbryt
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}