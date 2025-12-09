import { useEffect, useRef, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// App version - increment this when deploying critical updates
const APP_VERSION = '2.0.1';
const VERSION_KEY = 'gymdagboken_app_version';

// Update check interval in milliseconds (30 seconds)
const UPDATE_CHECK_INTERVAL = 30 * 1000;

// Force clear ALL caches - more aggressive for Safari
const forceCleanAllCaches = async () => {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      console.log('Clearing all caches:', cacheNames);
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      return true;
    } catch (e) {
      console.error('Failed to clear caches:', e);
      return false;
    }
  }
  return false;
};

// Unregister all service workers
const unregisterAllServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log('Unregistering service workers:', registrations.length);
      await Promise.all(registrations.map(reg => reg.unregister()));
      return true;
    } catch (e) {
      console.error('Failed to unregister service workers:', e);
      return false;
    }
  }
  return false;
};

// Check if version changed and force full refresh
const checkVersionAndUpdate = async () => {
  const storedVersion = localStorage.getItem(VERSION_KEY);
  
  if (storedVersion && storedVersion !== APP_VERSION) {
    console.log(`Version changed from ${storedVersion} to ${APP_VERSION}, forcing update...`);
    
    // Clear everything
    await forceCleanAllCaches();
    await unregisterAllServiceWorkers();
    
    // Store new version
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    
    // Force hard reload
    window.location.reload();
    return true;
  }
  
  // Store version if not set
  if (!storedVersion) {
    localStorage.setItem(VERSION_KEY, APP_VERSION);
  }
  
  return false;
};

export const PWAUpdateNotification = () => {
  const { t } = useTranslation();
  const hasShownToast = useRef(false);
  const updateCheckTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCheckedVersion = useRef(false);

  // Check version on mount
  useEffect(() => {
    if (!hasCheckedVersion.current) {
      hasCheckedVersion.current = true;
      checkVersionAndUpdate();
    }
  }, []);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
    offlineReady: [offlineReady],
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, r) {
      console.log('SW registered:', swUrl);
      
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
    },
  });

  // Check for updates when app becomes visible
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      console.log('App became visible, checking for updates...');
      // Check version first
      checkVersionAndUpdate();
      
      if (needRefresh) {
        updateServiceWorker(true);
      }
    }
  }, [needRefresh, updateServiceWorker]);

  // Check for updates when coming back online
  const handleOnline = useCallback(() => {
    console.log('Back online, checking for updates...');
    checkVersionAndUpdate();
    
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

// Export utility for manual cache clearing (can be used from settings)
export const forceAppUpdate = async () => {
  await forceCleanAllCaches();
  await unregisterAllServiceWorkers();
  localStorage.removeItem(VERSION_KEY);
  window.location.reload();
};
