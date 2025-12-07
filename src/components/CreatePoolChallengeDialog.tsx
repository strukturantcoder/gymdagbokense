import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, Heart, Users, Clock, Target, Calendar, UserCircle } from 'lucide-react';
import { usePoolChallenges } from '@/hooks/usePoolChallenges';
import { useIsMobile } from '@/hooks/use-mobile';

interface CreatePoolChallengeDialogProps {
  trigger?: React.ReactNode;
}

const challengeTypes = {
  strength: [
    { value: 'workouts', label: 'Antal träningspass', icon: Dumbbell },
    { value: 'sets', label: 'Antal set', icon: Target },
    { value: 'minutes', label: 'Total tid (minuter)', icon: Clock },
  ],
  cardio: [
    { value: 'workouts', label: 'Antal konditionspass', icon: Heart },
    { value: 'distance_km', label: 'Total distans (km)', icon: Target },
    { value: 'minutes', label: 'Total tid (minuter)', icon: Clock },
  ]
};

const durations = [
  { value: 7, label: '1 vecka' },
  { value: 14, label: '2 veckor' },
  { value: 30, label: '1 månad' },
];

export function CreatePoolChallengeDialog({ trigger }: CreatePoolChallengeDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<'strength' | 'cardio'>('strength');
  const [challengeType, setChallengeType] = useState('workouts');
  const [targetValue, setTargetValue] = useState(10);
  const [duration, setDuration] = useState(7);
  const [preferredGender, setPreferredGender] = useState<string>('any');
  const [minAge, setMinAge] = useState<number | undefined>();
  const [maxAge, setMaxAge] = useState<number | undefined>();
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createPoolEntry, userProfile, updateProfile } = usePoolChallenges();
  const isMobile = useIsMobile();

  const [birthYear, setBirthYear] = useState<number | undefined>(userProfile?.birth_year || undefined);
  const [gender, setGender] = useState<string>(userProfile?.gender || '');
  const [showProfileSetup, setShowProfileSetup] = useState(!userProfile?.birth_year || !userProfile?.gender);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Update profile if needed
      if (showProfileSetup && birthYear && gender) {
        await updateProfile(birthYear, gender);
      }

      const latestStartDate = new Date();
      latestStartDate.setDate(latestStartDate.getDate() + 3); // 3 days to find a match

      await createPoolEntry({
        challenge_category: category,
        challenge_type: challengeType,
        target_value: targetValue,
        duration_days: duration,
        preferred_gender: preferredGender === 'any' ? null : preferredGender,
        min_age: minAge || null,
        max_age: maxAge || null,
        allow_multiple: allowMultiple,
        max_participants: allowMultiple ? maxParticipants : 2,
        latest_start_date: latestStartDate.toISOString(),
      });

      setOpen(false);
    } catch (error) {
      console.error('Error creating pool entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Profile Setup */}
      <AnimatePresence>
        {showProfileSetup && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  För att matcha dig med rätt motståndare, ange din information:
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Födelseår</Label>
                    <Input
                      type="number"
                      placeholder="1990"
                      value={birthYear || ''}
                      onChange={(e) => setBirthYear(parseInt(e.target.value) || undefined)}
                      min={1920}
                      max={new Date().getFullYear() - 13}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kön</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj..." />
                      </SelectTrigger>
                      <SelectContent className="z-[200]" position="popper" sideOffset={4}>
                        <SelectItem value="male">Man</SelectItem>
                        <SelectItem value="female">Kvinna</SelectItem>
                        <SelectItem value="other">Annat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Selection */}
      <div className="space-y-2">
        <Label>Kategori</Label>
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setCategory('strength');
              setChallengeType('workouts');
            }}
            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
              category === 'strength' 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Dumbbell className={`w-8 h-8 ${category === 'strength' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="font-medium">Styrka</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setCategory('cardio');
              setChallengeType('workouts');
            }}
            className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
              category === 'cardio' 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <Heart className={`w-8 h-8 ${category === 'cardio' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="font-medium">Kondition</span>
          </motion.button>
        </div>
      </div>

      {/* Challenge Type */}
      <div className="space-y-2">
        <Label>Utmaningstyp</Label>
        <div className="grid grid-cols-1 gap-2">
          {challengeTypes[category].map((type) => (
            <motion.button
              key={type.value}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setChallengeType(type.value)}
              className={`p-3 rounded-lg border-2 flex items-center gap-3 transition-colors ${
                challengeType === type.value 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <type.icon className={`w-5 h-5 ${challengeType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="font-medium">{type.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Target Value */}
      <div className="space-y-2">
        <Label>Målvärde</Label>
        <Input
          type="number"
          value={targetValue}
          onChange={(e) => setTargetValue(parseInt(e.target.value) || 0)}
          min={1}
        />
        <p className="text-xs text-muted-foreground">
          {challengeType === 'workouts' && 'Antal pass att genomföra'}
          {challengeType === 'sets' && 'Antal set att genomföra'}
          {challengeType === 'minutes' && 'Minuter träning'}
          {challengeType === 'distance_km' && 'Kilometer att springa/cykla'}
        </p>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label>Längd</Label>
        <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[200]" position="popper" sideOffset={4}>
            {durations.map((d) => (
              <SelectItem key={d.value} value={d.value.toString()}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Opponent Preferences */}
      <div className="space-y-4 border-t pt-4">
        <h4 className="font-medium flex items-center gap-2">
          <UserCircle className="w-4 h-4" />
          Motståndarpreferenser
        </h4>

        <div className="space-y-2">
          <Label>Kön på motståndare</Label>
          <Select value={preferredGender} onValueChange={setPreferredGender}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[200]" position="popper" sideOffset={4}>
              <SelectItem value="any">Spelar ingen roll</SelectItem>
              <SelectItem value="male">Man</SelectItem>
              <SelectItem value="female">Kvinna</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Min ålder</Label>
            <Input
              type="number"
              placeholder="Ingen gräns"
              value={minAge || ''}
              onChange={(e) => setMinAge(parseInt(e.target.value) || undefined)}
              min={13}
              max={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Max ålder</Label>
            <Input
              type="number"
              placeholder="Ingen gräns"
              value={maxAge || ''}
              onChange={(e) => setMaxAge(parseInt(e.target.value) || undefined)}
              min={13}
              max={100}
            />
          </div>
        </div>
      </div>

      {/* Multi-participant Option */}
      <div className="space-y-4 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Grupputmaning
            </Label>
            <p className="text-xs text-muted-foreground">
              Tillåt fler än 2 deltagare
            </p>
          </div>
          <Switch
            checked={allowMultiple}
            onCheckedChange={setAllowMultiple}
          />
        </div>

        <AnimatePresence>
          {allowMultiple && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <Label>Max antal deltagare</Label>
              <Input
                type="number"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 2)}
                min={2}
                max={10}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || (showProfileSetup && (!birthYear || !gender))}
        className="w-full"
      >
        {isSubmitting ? 'Skapar...' : 'Sök motståndare'}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {trigger || (
            <Button className="w-full">
              <Users className="w-4 h-4 mr-2" />
              Hitta motståndare
            </Button>
          )}
        </DrawerTrigger>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Skapa utmaning</DrawerTitle>
            <DrawerDescription>
              Hitta en motståndare att tävla mot
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="w-full">
            <Users className="w-4 h-4 mr-2" />
            Hitta motståndare
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Skapa utmaning</DialogTitle>
          <DialogDescription>
            Hitta en motståndare att tävla mot
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
