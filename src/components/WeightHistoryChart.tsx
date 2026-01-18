import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO, subDays } from 'date-fns';
import { sv } from 'date-fns/locale';

interface WeightLog {
  id: string;
  weight_kg: number;
  logged_at: string;
}

interface WeightHistoryChartProps {
  className?: string;
  compact?: boolean;
}

export default function WeightHistoryChart({ className, compact = false }: WeightHistoryChartProps) {
  const { user } = useAuth();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWeightLogs();
    }
  }, [user]);

  const fetchWeightLogs = async () => {
    if (!user) return;

    const threeMonthsAgo = subDays(new Date(), 90);
    
    const { data, error } = await supabase
      .from('weight_logs')
      .select('id, weight_kg, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', threeMonthsAgo.toISOString())
      .order('logged_at', { ascending: true });

    if (!error && data) {
      setWeightLogs(data);
    }
    setIsLoading(false);
  };

  const chartData = weightLogs.map(log => ({
    date: format(parseISO(log.logged_at), 'd MMM', { locale: sv }),
    weight: log.weight_kg,
  }));

  const latestWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight_kg : null;
  const firstWeight = weightLogs.length > 0 ? weightLogs[0].weight_kg : null;
  const weightChange = latestWeight && firstWeight ? latestWeight - firstWeight : 0;

  const TrendIcon = weightChange > 0 ? TrendingUp : weightChange < 0 ? TrendingDown : Minus;
  const trendColor = weightChange > 0 ? 'text-red-500' : weightChange < 0 ? 'text-green-500' : 'text-muted-foreground';

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Vikthistorik</span>
            </div>
            {latestWeight && (
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold">{latestWeight.toFixed(1)} kg</span>
                <TrendIcon className={`w-4 h-4 ${trendColor}`} />
              </div>
            )}
          </div>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chartData}>
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Logga vikt för att se din utveckling
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Vikthistorik
          </CardTitle>
          {latestWeight && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{latestWeight.toFixed(1)} kg</span>
              {weightChange !== 0 && (
                <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                  <TrendIcon className="w-4 h-4" />
                  <span>{Math.abs(weightChange).toFixed(1)} kg</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Laddar...
          </div>
        ) : chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${value.toFixed(1)} kg`, 'Vikt']}
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            {weightLogs.length === 0 
              ? 'Ingen viktdata än. Logga din vikt för att se utvecklingen!' 
              : 'Logga mer för att se en graf'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
