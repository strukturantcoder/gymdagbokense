import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Swords, Dumbbell, Target, Timer } from 'lucide-react';
import { Friendship, useSocial } from '@/hooks/useSocial';

interface CreateChallengeDialogProps {
  friends: Friendship[];
  trigger?: React.ReactNode;
}

export default function CreateChallengeDialog({ friends, trigger }: CreateChallengeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [challengeType, setChallengeType] = useState<'workouts' | 'sets' | 'minutes'>('workouts');
  const [targetValue, setTargetValue] = useState('10');
  const [duration, setDuration] = useState('7');
  const { createChallenge } = useSocial();

  const handleCreate = async () => {
    if (!selectedFriend || !targetValue || !duration) return;
    
    await createChallenge(
      selectedFriend,
      challengeType,
      parseInt(targetValue),
      parseInt(duration)
    );
    
    setOpen(false);
    setSelectedFriend('');
    setTargetValue('10');
    setDuration('7');
  };

  const getDefaultTarget = (type: 'workouts' | 'sets' | 'minutes') => {
    switch (type) {
      case 'workouts': return '10';
      case 'sets': return '100';
      case 'minutes': return '300';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="hero">
            <Swords className="w-4 h-4 mr-2" />
            Skapa utmaning
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skapa ny utmaning</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Utmana en vän</Label>
            <Select value={selectedFriend} onValueChange={setSelectedFriend}>
              <SelectTrigger>
                <SelectValue placeholder="Välj vän" />
              </SelectTrigger>
              <SelectContent>
                {friends.map((f) => (
                  <SelectItem key={f.id} value={f.friend_profile?.user_id || ''}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={f.friend_profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {f.friend_profile?.display_name?.slice(0, 2).toUpperCase() || '??'}
                        </AvatarFallback>
                      </Avatar>
                      {f.friend_profile?.display_name || 'Anonym'}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Typ av utmaning</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={challengeType === 'workouts' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-3"
                onClick={() => {
                  setChallengeType('workouts');
                  setTargetValue(getDefaultTarget('workouts'));
                }}
              >
                <Dumbbell className="w-5 h-5 mb-1" />
                <span className="text-xs">Träningspass</span>
              </Button>
              <Button
                type="button"
                variant={challengeType === 'sets' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-3"
                onClick={() => {
                  setChallengeType('sets');
                  setTargetValue(getDefaultTarget('sets'));
                }}
              >
                <Target className="w-5 h-5 mb-1" />
                <span className="text-xs">Totala sets</span>
              </Button>
              <Button
                type="button"
                variant={challengeType === 'minutes' ? 'default' : 'outline'}
                className="flex flex-col h-auto py-3"
                onClick={() => {
                  setChallengeType('minutes');
                  setTargetValue(getDefaultTarget('minutes'));
                }}
              >
                <Timer className="w-5 h-5 mb-1" />
                <span className="text-xs">Träningstid</span>
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Målvärde</Label>
              <Input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                {challengeType === 'workouts' && 'Antal pass'}
                {challengeType === 'sets' && 'Antal sets'}
                {challengeType === 'minutes' && 'Minuter totalt'}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Varaktighet (dagar)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">1 vecka</SelectItem>
                  <SelectItem value="14">2 veckor</SelectItem>
                  <SelectItem value="30">1 månad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            variant="hero" 
            className="w-full" 
            onClick={handleCreate}
            disabled={!selectedFriend}
          >
            <Swords className="w-4 h-4 mr-2" />
            Skicka utmaning
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}