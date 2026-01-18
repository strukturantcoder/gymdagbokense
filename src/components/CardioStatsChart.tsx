import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Footprints, Timer, Flame, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { sv } from 'date-fns/locale';

interface CardioLog {
  id: string;
  activity_type: string;
  duration_minutes: number;
  distance_km: number | null;
  calories_burned: number | null;
  completed_at: string;
}

interface CardioStats {
  totalSessions: number;
  totalMinutes: number;
  totalDistance: number;
  totalCalories: number;
  weeklyData: { day: string; minutes: number; distance: number }[];
  activityBreakdown: { name: string; value: number }[];
}

const ACTIVITY_COLORS: Record<string, string> = {
  running: '#ef4444',
  walking: '#22c55e',
  cycling: '#3b82f6',
  swimming: '#06b6d4',
  intervals: '#f59e0b',
  other: '#8b5cf6',
};

const ACTIVITY_LABELS: Record<string, string> = {
  running: 'Löpning',
  walking: 'Promenad',
  cycling: 'Cykling',
  swimming: 'Simning',
  intervals: 'Intervaller',
  other: 'Övrigt',
};

export function CardioStatsChart() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<CardioStats | null>(null);

  useEffect(() => {
    if (user) {
      fetchCardioStats();
    }
  }, [user]);

  const fetchCardioStats = async () => {
    if (!user) return;
    setIsLoading(true);

    // Fetch last 30 days of cardio logs
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    const { data: logs, error } = await supabase
      .from('cardio_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('completed_at', thirtyDaysAgo.toISOString())
      .order('completed_at', { ascending: true });

    if (error) {
      console.error('Error fetching cardio logs:', error);
      setIsLoading(false);
      return;
    }

    if (!logs || logs.length === 0) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    // Calculate totals
    const totalSessions = logs.length;
    const totalMinutes = logs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
    const totalDistance = logs.reduce((sum, log) => sum + (log.distance_km || 0), 0);
    const totalCalories = logs.reduce((sum, log) => sum + (log.calories_burned || 0), 0);

    // Weekly data (last 7 days)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.completed_at);
        return logDate >= dayStart && logDate <= dayEnd;
      });

      weeklyData.push({
        day: format(date, 'EEE', { locale: sv }),
        minutes: dayLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0),
        distance: dayLogs.reduce((sum, log) => sum + (log.distance_km || 0), 0),
      });
    }

    // Activity breakdown
    const activityCounts: Record<string, number> = {};
    logs.forEach(log => {
      const type = log.activity_type || 'other';
      activityCounts[type] = (activityCounts[type] || 0) + 1;
    });

    const activityBreakdown = Object.entries(activityCounts).map(([name, value]) => ({
      name: ACTIVITY_LABELS[name] || name,
      value,
      color: ACTIVITY_COLORS[name] || '#8b5cf6',
    }));

    setStats({
      totalSessions,
      totalMinutes,
      totalDistance,
      totalCalories,
      weeklyData,
      activityBreakdown,
    });

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Footprints className="w-12 h-12 mx-auto mb-4 text-pink-500" />
          <p className="font-medium">Ingen konditionsdata</p>
          <p className="text-sm">Logga konditionspass för att se din statistik här.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20">
          <CardContent className="p-3 text-center">
            <Footprints className="w-5 h-5 mx-auto mb-1 text-pink-500" />
            <p className="text-xl font-bold">{stats.totalSessions}</p>
            <p className="text-xs text-muted-foreground">Pass (30d)</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="p-3 text-center">
            <Timer className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-xl font-bold">{Math.round(stats.totalMinutes)}</p>
            <p className="text-xs text-muted-foreground">Minuter</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-xl font-bold">{stats.totalDistance.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Kilometer</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20">
          <CardContent className="p-3 text-center">
            <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <p className="text-xl font-bold">{Math.round(stats.totalCalories)}</p>
            <p className="text-xs text-muted-foreground">Kalorier</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly activity chart */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm">Senaste 7 dagarna</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 11 }} 
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  className="text-muted-foreground"
                  width={30}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value} min`, 'Tid']}
                />
                <Bar 
                  dataKey="minutes" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Activity breakdown */}
      {stats.activityBreakdown.length > 1 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm">Aktivitetsfördelning</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="h-[160px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.activityBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats.activityBreakdown.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={(entry as any).color || ACTIVITY_COLORS.other} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => [`${value} pass`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {stats.activityBreakdown.map((activity, index) => (
                <div key={index} className="flex items-center gap-1 text-xs">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: (activity as any).color || ACTIVITY_COLORS.other }}
                  />
                  <span className="text-muted-foreground">{activity.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
