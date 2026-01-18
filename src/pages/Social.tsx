import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSocial } from '@/hooks/useSocial';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Swords, Trophy, Loader2, ArrowLeft, Sparkles, Globe, Target, UserPlus
} from 'lucide-react';
import AdBanner from '@/components/AdBanner';
import XPProgress from '@/components/XPProgress';

const socialCategories = [
  { 
    id: 'friends', 
    label: 'Vänner', 
    icon: Users, 
    gradient: 'from-blue-500/20 to-indigo-500/20',
    border: 'border-blue-500/30 hover:border-blue-500/60',
    iconColor: 'text-blue-500',
    description: 'Hantera vänner & sök användare'
  },
  { 
    id: 'teams', 
    label: 'Lag', 
    icon: Trophy, 
    gradient: 'from-yellow-500/20 to-amber-500/20',
    border: 'border-yellow-500/30 hover:border-yellow-500/60',
    iconColor: 'text-yellow-500',
    description: 'Skapa & gå med i lag'
  },
  { 
    id: 'challenges', 
    label: 'Utmaningar', 
    icon: Swords, 
    gradient: 'from-red-500/20 to-orange-500/20',
    border: 'border-red-500/30 hover:border-red-500/60',
    iconColor: 'text-red-500',
    description: 'Utmana dina vänner'
  },
  { 
    id: 'pool', 
    label: 'Matchning', 
    icon: Target, 
    gradient: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/30 hover:border-purple-500/60',
    iconColor: 'text-purple-500',
    description: 'Automatisk matchmaking'
  },
  { 
    id: 'community', 
    label: 'Tävlingar', 
    icon: Globe, 
    gradient: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30 hover:border-green-500/60',
    iconColor: 'text-green-500',
    description: 'Community-tävlingar'
  },
  { 
    id: 'achievements', 
    label: 'Prestationer', 
    icon: Sparkles, 
    gradient: 'from-cyan-500/20 to-teal-500/20',
    border: 'border-cyan-500/30 hover:border-cyan-500/60',
    iconColor: 'text-cyan-500',
    description: 'Dina achievements'
  },
];

export default function Social() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { 
    pendingRequests, 
    challenges, 
    userStats, 
    loading: socialLoading,
  } = useSocial();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading || socialLoading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingChallenges = challenges.filter(c => c.status === 'pending');

  const getBadgeCount = (id: string) => {
    switch (id) {
      case 'friends': return pendingRequests.length;
      case 'challenges': return pendingChallenges.filter(c => c.challenged_id === user?.id).length;
      default: return 0;
    }
  };

  const handleCategorySelect = (id: string) => {
    navigate(`/social/${id}`);
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Compact Header */}
      <header className="border-b border-border bg-card shrink-0">
        <div className="px-3 py-2 md:px-4 md:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/dashboard')}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display text-base font-bold">SOCIALT</span>
              </div>
            </div>
            {(pendingRequests.length > 0 || pendingChallenges.length > 0) && (
              <Badge variant="destructive" className="text-xs">
                {pendingRequests.length + pendingChallenges.filter(c => c.challenged_id === user?.id).length} nya
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main content - fixed height, no scroll */}
      <main className="flex-1 flex flex-col px-3 py-3 md:px-4 md:py-4 pb-16 md:pb-4 overflow-hidden">
        {/* XP Progress - compact */}
        <Card className="shrink-0 mb-3 border-primary/30">
          <CardContent className="p-3">
            <XPProgress stats={userStats} />
          </CardContent>
        </Card>

        {/* Social category cards - 2x3 grid */}
        <div className="flex-1 grid grid-cols-2 gap-2 min-h-0 content-start">
          {socialCategories.map((category, index) => {
            const badgeCount = getBadgeCount(category.id);
            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.97 }}
              >
                <Card 
                  className={`cursor-pointer bg-gradient-to-br ${category.gradient} ${category.border} transition-all h-full relative`}
                  onClick={() => handleCategorySelect(category.id)}
                >
                  {badgeCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                    >
                      {badgeCount}
                    </Badge>
                  )}
                  <CardContent className="p-3 flex flex-col justify-between h-full min-h-[80px]">
                    <category.icon className={`w-5 h-5 ${category.iconColor}`} />
                    <div>
                      <p className="text-sm font-semibold">{category.label}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{category.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Ad Banner at bottom */}
        <div className="shrink-0 mt-3">
          <AdBanner format="mobile_banner" placement="social_bottom" showPremiumPrompt={false} />
        </div>
      </main>
    </div>
  );
}
