import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, ArrowLeft, Loader2, Footprints, Zap, Scale, BarChart3, TrendingUp, Activity, Timer, Watch } from 'lucide-react';
import AdBanner from '@/components/AdBanner';
import { StrengthProgressChart } from '@/components/StrengthProgressChart';
import { WorkoutHistoryChart } from '@/components/WorkoutHistoryChart';
import WeightHistoryChart from '@/components/WeightHistoryChart';
import { CardioStatsChart } from '@/components/CardioStatsChart';
import { AppShell } from '@/components/layout/AppShell';
import { GarminStatsChart } from '@/components/GarminStatsChart';

interface QuickStats {
  totalWorkouts: number;
  totalCardio: number;
  totalWods: number;
  totalMinutes: number;
  currentStreak: number;
}

export default function Statistics() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<QuickStats>({ 
    totalWorkouts: 0, 
    totalCardio: 0, 
    totalWods: 0, 
    totalMinutes: 0,
    currentStreak: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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
    
    const [workouts, cardio, wods, userStats] = await Promise.all([
      supabase.from('workout_logs').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('cardio_logs').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('wod_logs').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
      supabase.from('user_stats').select('total_minutes, current_streak').eq('user_id', user!.id).single(),
    ]);

    setStats({
      totalWorkouts: workouts.count || 0,
      totalCardio: cardio.count || 0,
      totalWods: wods.count || 0,
      totalMinutes: userStats.data?.total_minutes || 0,
      currentStreak: userStats.data?.current_streak || 0,
    });
    
    setIsLoading(false);
  };

  if (loading || isLoading) {
    return <AppShell loading loadingComponent={<Loader2 className="h-8 w-8 animate-spin text-primary" />} />;
  }

  const quickStatCards = [
    { label: 'Styrkepass', value: stats.totalWorkouts, icon: Dumbbell, color: 'text-orange-500' },
    { label: 'Konditionspass', value: stats.totalCardio, icon: Footprints, color: 'text-pink-500' },
    { label: 'WODs', value: stats.totalWods, icon: Zap, color: 'text-green-500' },
    { label: 'Streak', value: `${stats.currentStreak}d`, icon: TrendingUp, color: 'text-primary' },
  ];

  return (
    <AppShell>
      {/* Compact Header */}
      <header className="border-b border-border bg-card shrink-0">
        <div className="px-3 py-2 md:px-4 md:py-3">
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
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 md:px-4 md:py-4 pb-20 md:pb-4 space-y-4">
        {/* Top Ad Banner */}
        <AdBanner format="horizontal" placement="statistics_top" />
        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          {quickStatCards.map((stat) => (
            <Card key={stat.label} className="bg-card/50">
              <CardContent className="p-2 text-center">
                <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs for different stat views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-9">
            <TabsTrigger value="overview" className="text-xs px-1">
              <Activity className="w-3 h-3 mr-1" />
              Översikt
            </TabsTrigger>
            <TabsTrigger value="strength" className="text-xs px-1">
              <Dumbbell className="w-3 h-3 mr-1" />
              Styrka
            </TabsTrigger>
            <TabsTrigger value="cardio" className="text-xs px-1">
              <Footprints className="w-3 h-3 mr-1" />
              Kondition
            </TabsTrigger>
            <TabsTrigger value="garmin" className="text-xs px-1">
              <Watch className="w-3 h-3 mr-1" />
              Garmin
            </TabsTrigger>
            <TabsTrigger value="weight" className="text-xs px-1">
              <Scale className="w-3 h-3 mr-1" />
              Vikt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3 space-y-4">
            {/* Workout history chart */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary" />
                  Träningshistorik
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <WorkoutHistoryChart />
              </CardContent>
            </Card>

            {/* Weight chart preview */}
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4 text-blue-500" />
                  Viktutveckling
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <WeightHistoryChart compact />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strength" className="mt-3 space-y-4">
            <StrengthProgressChart />
            <WorkoutHistoryChart />
          </TabsContent>

          <TabsContent value="cardio" className="mt-3">
            <CardioStatsChart />
          </TabsContent>

          <TabsContent value="garmin" className="mt-3">
            <GarminStatsChart />
          </TabsContent>

          <TabsContent value="weight" className="mt-3">
            <WeightHistoryChart />
          </TabsContent>
        </Tabs>

        {/* Middle Ad Banner */}
        <AdBanner format="horizontal" placement="statistics_middle" />
        
        {/* Bottom Ad Banner */}
        <AdBanner format="horizontal" placement="statistics_bottom" />
      </main>
    </AppShell>
  );
}
