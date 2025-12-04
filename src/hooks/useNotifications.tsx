import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const typedData = (data || []) as Notification[];
      setNotifications(typedData);
      setUnreadCount(typedData.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const checkActiveWorkouts = useCallback(async () => {
    if (!user) return;

    try {
      // Check for workouts that have been active for over 120 minutes
      const twoHoursAgo = new Date(Date.now() - 120 * 60 * 1000).toISOString();
      
      const { data: activeWorkouts, error } = await supabase
        .from('workout_logs')
        .select('id, workout_day, created_at')
        .eq('user_id', user.id)
        .is('duration_minutes', null)
        .lt('created_at', twoHoursAgo);

      if (error) throw error;

      // Check if we already have notifications for these workouts
      for (const workout of activeWorkouts || []) {
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('type', 'workout_active')
          .eq('related_id', workout.id)
          .maybeSingle();

        if (!existingNotif) {
          // Create notification for this active workout
          await supabase.from('notifications').insert({
            user_id: user.id,
            type: 'workout_active',
            title: 'Pågående pass',
            message: `Ditt pass "${workout.workout_day}" har pågått i över 2 timmar. Vill du avsluta det?`,
            related_id: workout.id
          });
        }
      }
      
      // Refresh notifications after checking
      fetchNotifications();
    } catch (error) {
      console.error('Error checking active workouts:', error);
    }
  }, [user, fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Check for active workouts periodically
  useEffect(() => {
    if (!user) return;

    checkActiveWorkouts();
    const interval = setInterval(checkActiveWorkouts, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(interval);
  }, [user, checkActiveWorkouts]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications
  };
};
