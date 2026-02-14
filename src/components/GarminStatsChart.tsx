import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Flame, Footprints, Mountain, Activity, Timer } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import { format, subDays } from "date-fns";
import { sv } from "date-fns/locale";

interface GarminActivity {
  start_time: string;
  activity_type: string;
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  elevation_gain: number | null;
  average_speed: number | null;
}

interface GarminSummary {
  totalActivities: number;
  avgHeartRate: number;
  avgMaxHeartRate: number;
  totalCalories: number;
  totalDistance: number;
  totalDuration: number;
  totalElevation: number;
}

export function GarminStatsChart() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<GarminActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("garmin_activities")
        .select("start_time, activity_type, average_heart_rate, max_heart_rate, calories, duration_seconds, distance_meters, elevation_gain, average_speed")
        .eq("user_id", user.id)
        .gte("start_time", since)
        .order("start_time", { ascending: true });

      if (!error && data) setActivities(data);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Ingen Garmin-data hittades de senaste 30 dagarna.</p>
          <p className="text-xs mt-1">Koppla din Garmin under Konto för att se statistik här.</p>
        </CardContent>
      </Card>
    );
  }

  // Summary
  const withHR = activities.filter((a) => a.average_heart_rate);
  const summary: GarminSummary = {
    totalActivities: activities.length,
    avgHeartRate: withHR.length
      ? Math.round(withHR.reduce((s, a) => s + (a.average_heart_rate || 0), 0) / withHR.length)
      : 0,
    avgMaxHeartRate: withHR.length
      ? Math.round(withHR.reduce((s, a) => s + (a.max_heart_rate || 0), 0) / withHR.length)
      : 0,
    totalCalories: activities.reduce((s, a) => s + (a.calories || 0), 0),
    totalDistance: activities.reduce((s, a) => s + (a.distance_meters || 0), 0) / 1000,
    totalDuration: activities.reduce((s, a) => s + (a.duration_seconds || 0), 0),
    totalElevation: activities.reduce((s, a) => s + (a.elevation_gain || 0), 0),
  };

  // Heart rate chart data
  const hrData = activities
    .filter((a) => a.average_heart_rate)
    .map((a) => ({
      date: format(new Date(a.start_time), "d MMM", { locale: sv }),
      medel: a.average_heart_rate,
      max: a.max_heart_rate,
      typ: a.activity_type,
    }));

  // Activity type breakdown
  const typeMap: Record<string, { count: number; cal: number; min: number }> = {};
  activities.forEach((a) => {
    const t = a.activity_type;
    if (!typeMap[t]) typeMap[t] = { count: 0, cal: 0, min: 0 };
    typeMap[t].count += 1;
    typeMap[t].cal += a.calories || 0;
    typeMap[t].min += Math.round((a.duration_seconds || 0) / 60);
  });

  const typeLabels: Record<string, string> = {
    running: "Löpning",
    walking: "Promenad",
    strength: "Styrka",
    cycling: "Cykling",
    other: "Övrigt",
  };

  const breakdownData = Object.entries(typeMap).map(([type, vals]) => ({
    name: typeLabels[type] || type,
    pass: vals.count,
    kalorier: vals.cal,
    minuter: vals.min,
  }));

  const summaryCards = [
    { label: "Medelpuls", value: `${summary.avgHeartRate} bpm`, icon: Heart, color: "text-red-500" },
    { label: "Max puls (snitt)", value: `${summary.avgMaxHeartRate} bpm`, icon: Heart, color: "text-rose-600" },
    { label: "Kalorier", value: summary.totalCalories.toLocaleString(), icon: Flame, color: "text-orange-500" },
    { label: "Distans", value: `${summary.totalDistance.toFixed(1)} km`, icon: Footprints, color: "text-blue-500" },
    { label: "Tid", value: `${Math.round(summary.totalDuration / 60)} min`, icon: Timer, color: "text-green-500" },
    { label: "Höjdmeter", value: `${Math.round(summary.totalElevation)} m`, icon: Mountain, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        {summaryCards.map((s) => (
          <Card key={s.label} className="bg-card/50">
            <CardContent className="p-2 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-sm font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Heart rate trend chart */}
      {hrData.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              Pulsutveckling (30 dagar)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-1 pb-3">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={hrData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={["dataMin - 10", "dataMax + 10"]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: number, name: string) => [
                    `${value} bpm`,
                    name === "medel" ? "Medelpuls" : "Maxpuls",
                  ]}
                />
                <Line type="monotone" dataKey="medel" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={{ r: 3 }} name="medel" />
                <Line type="monotone" dataKey="max" stroke="hsl(350, 72%, 40%)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" name="max" />
                <Legend
                  formatter={(value) => (value === "medel" ? "Medelpuls" : "Maxpuls")}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Activity type breakdown */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Aktivitetstyper (30 dagar)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-1 pb-3">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={breakdownData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="pass" fill="hsl(24, 95%, 53%)" name="Pass" radius={[4, 4, 0, 0]} />
              <Bar dataKey="kalorier" fill="hsl(0, 72%, 51%)" name="Kalorier" radius={[4, 4, 0, 0]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
