import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, ArrowLeft, Loader2, TrendingUp, Footprints, Zap, Scale, BarChart3 } from 'lucide-react';
import AdBanner from '@/components/AdBanner';

interface QuickStats {
  totalWorkouts: number;
  totalCardio: number;
  totalWods: number;
  totalWeightLogs: number;
}

const statCategories = [
  { 
    id: 'strength', 
    label: 'Styrka', 
    icon: Dumbbell, 
    gradient: 'from-orange-500/20 to-red-500/20',
    border: 'border-orange-500/30 hover:border-orange-500/60',
    iconColor: 'text-orange-500',
    description: 'Styrketräning & progression'
  },
  { 
    id: 'cardio', 
    label: 'Kondition', 
    icon: Footprints, 
    gradient: 'from-pink-500/20 to-rose-500/20',
    border: 'border-pink-500/30 hover:border-pink-500/60',
    iconColor: 'text-pink-500',
    description: 'Löpning, cykling, simning'
  },
  { 
    id: 'crossfit', 
    label: 'CrossFit', 
    icon: Zap, 
    gradient: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30 hover:border-green-500/60',
    iconColor: 'text-green-500',
    description: 'WOD & funktionell träning'
  },
  { 
    id: 'weight', 
    label: 'Vikt', 
    icon: Scale, 
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30 hover:border-blue-500/60',
    iconColor: 'text-blue-500',
    description: 'Vikthistorik & utveckling'
  },
];

export default function Statistics() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<QuickStats>({ totalWorkouts: 0, totalCardio: 0, totalWods: 0, totalWeightLogs: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchQuickStats();
    }
  }, [user]);

  const fetchQuickStats = async () => {
    setIsLoading(true);
    
    const [workouts, cardio, wods, weights] = await Promise.all([
      supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('cardio_logs').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('wod_logs').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('weight_logs').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
    ]);

    setStats({
      totalWorkouts: workouts.count || 0,
      totalCardio: cardio.count || 0,
      totalWods: wods.count || 0,
      totalWeightLogs: weights.count || 0,
    });
    
    setIsLoading(false);
  };

  if (loading || isLoading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatCount = (id: string) => {
    switch (id) {
      case 'strength': return stats.totalWorkouts;
      case 'cardio': return stats.totalCardio;
      case 'crossfit': return stats.totalWods;
      case 'weight': return stats.totalWeightLogs;
      default: return 0;
    }
  };

  const handleCategorySelect = (id: string) => {
    navigate(`/stats/${id}`);
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
                  <BarChart3 className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display text-base font-bold">STATISTIK</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content - fixed height, no scroll */}
      <main className="flex-1 flex flex-col px-3 py-3 md:px-4 md:py-4 pb-16 md:pb-4 overflow-hidden">
        {/* Title */}
        <div className="shrink-0 mb-3">
          <h1 className="text-lg font-display font-bold">Din utveckling</h1>
          <p className="text-xs text-muted-foreground">Välj kategori för att se detaljer</p>
        </div>

        {/* Stats category cards - 2x2 grid */}
        <div className="flex-1 grid grid-cols-2 gap-2 min-h-0 content-start">
          {statCategories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileTap={{ scale: 0.97 }}
            >
              <Card 
                className={`cursor-pointer bg-gradient-to-br ${category.gradient} ${category.border} transition-all h-full`}
                onClick={() => handleCategorySelect(category.id)}
              >
                <CardContent className="p-3 flex flex-col justify-between h-full min-h-[100px]">
                  <div className="flex items-center justify-between">
                    <category.icon className={`w-5 h-5 ${category.iconColor}`} />
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{getStatCount(category.id)}</p>
                    <p className="text-xs text-muted-foreground">{category.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Ad Banner at bottom */}
        <div className="shrink-0 mt-3">
          <AdBanner format="mobile_banner" placement="statistics_bottom" showPremiumPrompt={false} />
        </div>
      </main>
    </div>
  );
}
