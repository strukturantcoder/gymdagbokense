import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface WeekData {
  week: string;
  workouts: number;
  cardio: number;
  total: number;
}

export function WorkoutHistoryChart() {
  const { user } = useAuth();
  const [data, setData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHistoryData();
    }
  }, [user]);

  const fetchHistoryData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const weeks: WeekData[] = [];
      
      // Fetch last 8 weeks of data
      for (let i = 7; i >= 0; i--) {
        const now = new Date();
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        
        // Fetch workout logs
        const { data: workoutData } = await supabase
          .from('workout_logs')
          .select('id')
          .eq('user_id', user.id)
          .gte('completed_at', weekStart.toISOString())
          .lte('completed_at', weekEnd.toISOString());
        
        // Fetch cardio logs
        const { data: cardioData } = await supabase
          .from('cardio_logs')
          .select('id')
          .eq('user_id', user.id)
          .gte('completed_at', weekStart.toISOString())
          .lte('completed_at', weekEnd.toISOString());
        
        // Fetch WOD logs
        const { data: wodData } = await supabase
          .from('wod_logs')
          .select('id')
          .eq('user_id', user.id)
          .gte('completed_at', weekStart.toISOString())
          .lte('completed_at', weekEnd.toISOString());
        
        const workouts = (workoutData?.length || 0) + (wodData?.length || 0);
        const cardio = cardioData?.length || 0;
        
        weeks.push({
          week: format(weekStart, 'd MMM', { locale: sv }),
          workouts,
          cardio,
          total: workouts + cardio
        });
      }
      
      setData(weeks);
    } catch (error) {
      console.error('Error fetching history data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalThisWeek = data[data.length - 1]?.total || 0;
  const totalLastWeek = data[data.length - 2]?.total || 0;
  const trend = totalLastWeek > 0 
    ? Math.round(((totalThisWeek - totalLastWeek) / totalLastWeek) * 100) 
    : 0;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Träningshistorik
          </CardTitle>
          {trend !== 0 && (
            <span className={`text-sm font-medium ${trend > 0 ? 'text-green-500' : 'text-red-400'}`}>
              {trend > 0 ? '+' : ''}{trend}% vs förra veckan
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="20%">
              <XAxis 
                dataKey="week" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold text-foreground mb-1">{label}</p>
                        <p className="text-sm text-muted-foreground">
                          Styrka: <span className="text-primary font-medium">{payload[0]?.payload.workouts}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Cardio: <span className="text-gym-amber font-medium">{payload[0]?.payload.cardio}</span>
                        </p>
                        <p className="text-sm text-foreground mt-1">
                          Totalt: <span className="font-bold">{payload[0]?.payload.total}</span> pass
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === data.length - 1 
                      ? 'hsl(var(--primary))' 
                      : 'hsl(var(--muted))'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Senaste 8 veckorna
        </p>
      </CardContent>
    </Card>
  );
}
