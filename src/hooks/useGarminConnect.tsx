import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface GarminConnection {
  id: string;
  user_id: string;
  garmin_user_id: string | null;
  display_name: string | null;
  connected_at: string;
  last_sync_at: string | null;
  is_active: boolean;
}

interface GarminActivity {
  id: string;
  garmin_activity_id: string;
  activity_type: string;
  activity_name: string | null;
  start_time: string;
  duration_seconds: number | null;
  distance_meters: number | null;
  calories: number | null;
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  average_speed: number | null;
  elevation_gain: number | null;
}

export function useGarminConnect() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const [connection, setConnection] = useState<GarminConnection | null>(null);
  const [activities, setActivities] = useState<GarminActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("garmin_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      setConnection(data);
    } catch (error) {
      console.error("Error fetching Garmin connection:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchActivities = useCallback(async (limit = 20) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("garmin_activities")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time", { ascending: false })
        .limit(limit);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error("Error fetching Garmin activities:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  useEffect(() => {
    if (connection) {
      fetchActivities();
    }
  }, [connection, fetchActivities]);

  const startConnect = async () => {
    if (!session?.access_token) {
      toast({
        title: "Ej inloggad",
        description: "Du måste vara inloggad för att koppla Garmin.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);

    try {
      const callbackUrl = `${window.location.origin}/account?garmin_callback=true`;
      
      const response = await supabase.functions.invoke("garmin-oauth-start", {
        body: { callbackUrl },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { authorizeUrl } = response.data;
      
      if (authorizeUrl) {
        // Redirect to Garmin authorization
        window.location.href = authorizeUrl;
      } else {
        throw new Error("No authorization URL received");
      }
    } catch (error) {
      console.error("Error starting Garmin connect:", error);
      toast({
        title: "Anslutningsfel",
        description: "Kunde inte starta Garmin-anslutning. Försök igen.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const completeConnect = async (oauthToken: string, oauthVerifier: string) => {
    if (!session?.access_token) return false;

    setIsConnecting(true);

    try {
      const response = await supabase.functions.invoke("garmin-oauth-callback", {
        body: { oauth_token: oauthToken, oauth_verifier: oauthVerifier },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Garmin kopplat!",
        description: "Ditt Garmin-konto är nu kopplat. Synkroniserar aktiviteter...",
      });

      await fetchConnection();
      await syncActivities();
      
      return true;
    } catch (error) {
      console.error("Error completing Garmin connect:", error);
      toast({
        title: "Anslutningsfel",
        description: "Kunde inte slutföra Garmin-anslutning.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const syncActivities = async (startDate?: string, endDate?: string) => {
    if (!session?.access_token) return;

    setIsSyncing(true);

    try {
      const response = await supabase.functions.invoke("garmin-sync-activities", {
        body: { startDate, endDate },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { syncedCount, message } = response.data;
      
      toast({
        title: "Synkronisering klar",
        description: message || `${syncedCount} aktiviteter synkroniserade.`,
      });

      await fetchActivities();
      await fetchConnection();
    } catch (error) {
      console.error("Error syncing Garmin activities:", error);
      toast({
        title: "Synkroniseringsfel",
        description: "Kunde inte synkronisera aktiviteter från Garmin.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const disconnect = async (deleteActivities = false) => {
    if (!session?.access_token) return;

    try {
      const response = await supabase.functions.invoke("garmin-disconnect", {
        body: { deleteActivities },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Garmin bortkopplat",
        description: "Ditt Garmin-konto har kopplats bort.",
      });

      setConnection(null);
      if (deleteActivities) {
        setActivities([]);
      }
    } catch (error) {
      console.error("Error disconnecting Garmin:", error);
      toast({
        title: "Fel",
        description: "Kunde inte koppla bort Garmin.",
        variant: "destructive",
      });
    }
  };

  return {
    connection,
    activities,
    isLoading,
    isConnecting,
    isSyncing,
    isConnected: !!connection,
    startConnect,
    completeConnect,
    syncActivities,
    disconnect,
    fetchActivities,
    fetchConnection,
  };
}
