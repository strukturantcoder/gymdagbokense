import { useEffect, useRef, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Update check interval in milliseconds (30 seconds)
const UPDATE_CHECK_INTERVAL = 30 * 1000;

// Clear all caches on load to fix Safari issues
const clearOldCaches = async () => {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          // Only clear old workbox caches, not current ones
          if (cacheName.includes('workbox') || cacheName.includes('precache')) {
            console.log('Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    } catch (e) {
      console.error('Failed to clear caches:', e);
    }
  }
};

export const PWAUpdateNotification = () => {
  const { t } = useTranslation();
  const hasShownToast = useRef(false);
  const updateCheckTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
    offlineReady: [offlineReady],
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, r) {
      console.log('SW registered:', swUrl);
      
      // Clear old caches on SW registration
      clearOldCaches();
      
      if (r) {
        // Clear any existing interval
        if (updateCheckTimer.current) {
          clearInterval(updateCheckTimer.current);
        }

        // Immediately check for updates
        r.update().catch(console.error);
        
        // Check for updates periodically
        updateCheckTimer.current = setInterval(() => {
          console.log('Checking for SW updates...');
          r.update().catch(console.error);
        }, UPDATE_CHECK_INTERVAL);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
      // On Safari registration errors, try clearing caches
      clearOldCaches();
    },
  });

  // Check for updates when app becomes visible
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      console.log('App became visible, checking for updates...');
      // Force a reload check by calling updateServiceWorker
      if (needRefresh) {
        updateServiceWorker(true);
      }
    }
  }, [needRefresh, updateServiceWorker]);

  // Check for updates when coming back online
  const handleOnline = useCallback(() => {
    console.log('Back online, checking for updates...');
    if (needRefresh) {
      updateServiceWorker(true);
    }
  }, [needRefresh, updateServiceWorker]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleVisibilityChange);
      if (updateCheckTimer.current) {
        clearInterval(updateCheckTimer.current);
      }
    };
  }, [handleVisibilityChange, handleOnline]);

  // Handle the update when needRefresh becomes true
  useEffect(() => {
    if (needRefresh && !hasShownToast.current) {
      hasShownToast.current = true;
      
      console.log('Update available, applying immediately...');
      
      // Show brief updating notification
      toast(
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          <div className="flex-1">
            <p className="font-medium">{t('update.updating', 'Uppdaterar appen...')}</p>
          </div>
        </div>,
        {
          duration: 2000,
          id: 'pwa-updating',
        }
      );

      // Apply the update immediately
      updateServiceWorker(true).then(() => {
        // Show success message
        setTimeout(() => {
          toast(
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="font-medium">{t('update.updated', 'Appen är uppdaterad!')}</p>
              </div>
            </div>,
            {
              duration: 3000,
              id: 'pwa-updated',
            }
          );
        }, 1000);
      });
    }
  }, [needRefresh, updateServiceWorker, t]);

  // Reset the flag when component unmounts or needRefresh changes to false
  useEffect(() => {
    if (!needRefresh) {
      hasShownToast.current = false;
    }
  }, [needRefresh]);

  return null;
};
