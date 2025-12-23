import { useEffect, useRef, useCallback, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle, Download, X, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';

// App version - increment this when deploying updates
export const APP_VERSION = '2.2.0';
const VERSION_KEY = 'gymdagboken_app_version';
const PUSH_SENT_KEY = 'gymdagboken_push_sent_version';

// Update check interval in milliseconds (30 seconds)
const UPDATE_CHECK_INTERVAL = 30 * 1000;

// Version history with release notes
export const VERSION_NOTES: Record<string, string> = {
  '2.2.0': 'Automatisk push-notis till användare vid nya versioner.',
  '2.1.0': 'Ny uppdateringsbanderoll med versionsinfo och klickbara övningar i programförhandsvisningen.',
  '2.0.1': 'Förbättrad finjusteringsruta för träningsprogram.',
  '2.0.0': 'Stor uppdatering med nya funktioner och förbättringar.',
};

// Get the release notes for the current version
export const getCurrentReleaseNotes = () => {
  return VERSION_NOTES[APP_VERSION] || 'Buggfixar och prestandaförbättringar.';
};

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
  const { isAdmin } = useAdmin();
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const hasShownBanner = useRef(false);
  const updateCheckTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCheckedVersion = useRef(false);
  const hasSentPushNotification = useRef(false);

  // Send push notification for new version (admin only, once per version)
  const sendVersionPushNotification = useCallback(async () => {
    if (!isAdmin || hasSentPushNotification.current) return;
    
    const sentVersion = localStorage.getItem(PUSH_SENT_KEY);
    if (sentVersion === APP_VERSION) return;
    
    hasSentPushNotification.current = true;
    
    try {
      console.log(`Admin detected - sending push notification for version ${APP_VERSION}`);
      
      const { data, error } = await supabase.functions.invoke('notify-app-update', {
        body: { 
          version: APP_VERSION, 
          message: getCurrentReleaseNotes()
        },
      });

      if (error) {
        console.error('Failed to send version push notification:', error);
        return;
      }

      // Mark this version as notified
      localStorage.setItem(PUSH_SENT_KEY, APP_VERSION);
      
      console.log(`Push notification sent for version ${APP_VERSION}:`, data);
      toast.success(`Push-notis skickad till ${data.sent} användare om version ${APP_VERSION}`);
    } catch (error) {
      console.error('Error sending version push notification:', error);
    }
  }, [isAdmin]);

  // Check version on mount
  useEffect(() => {
    if (!hasCheckedVersion.current) {
      hasCheckedVersion.current = true;
      checkVersionAndUpdate();
    }
  }, []);

  // Send push notification when admin loads the app with a new version
  useEffect(() => {
    if (isAdmin) {
      sendVersionPushNotification();
    }
  }, [isAdmin, sendVersionPushNotification]);

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
      
      if (needRefresh && !hasShownBanner.current) {
        setShowUpdateBanner(true);
        hasShownBanner.current = true;
      }
    }
  }, [needRefresh]);

  // Check for updates when coming back online
  const handleOnline = useCallback(() => {
    console.log('Back online, checking for updates...');
    checkVersionAndUpdate();
    
    if (needRefresh && !hasShownBanner.current) {
      setShowUpdateBanner(true);
      hasShownBanner.current = true;
    }
  }, [needRefresh]);

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

  // Show banner when needRefresh becomes true
  useEffect(() => {
    if (needRefresh && !hasShownBanner.current) {
      hasShownBanner.current = true;
      setShowUpdateBanner(true);
    }
  }, [needRefresh]);

  // Reset the flag when needRefresh changes to false
  useEffect(() => {
    if (!needRefresh) {
      hasShownBanner.current = false;
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      await updateServiceWorker(true);
      
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
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Uppdateringen misslyckades. Försök igen.');
    } finally {
      setIsUpdating(false);
      setShowUpdateBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowUpdateBanner(false);
  };

  return (
    <AnimatePresence>
      {showUpdateBanner && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[100] safe-area-top"
        >
          <div className="bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground shadow-lg">
            <div className="container mx-auto px-4 py-3">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-sm">
                      Ny version tillgänglig!
                    </h3>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-mono">
                      v{APP_VERSION}
                    </span>
                  </div>
                  <p className="text-xs text-primary-foreground/90 line-clamp-2">
                    {getCurrentReleaseNotes()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    size="sm"
                    variant="secondary"
                    className="bg-white text-primary hover:bg-white/90 font-semibold h-9"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                        Uppdaterar...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-1.5" />
                        Uppdatera
                      </>
                    )}
                  </Button>
                  <button
                    onClick={handleDismiss}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Stäng"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Progress callback type for manual cache clearing
export type UpdateProgressCallback = (step: number, totalSteps: number, message: string) => void;

// Export utility for manual cache clearing with progress (can be used from settings)
export const forceAppUpdate = async (onProgress?: UpdateProgressCallback) => {
  const totalSteps = 5;
  
  // Step 1: Start
  onProgress?.(1, totalSteps, 'Förbereder...');
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Step 2: Clear caches
  onProgress?.(2, totalSteps, 'Rensar cache...');
  await forceCleanAllCaches();
  await new Promise(resolve => setTimeout(resolve, 400));
  
  // Step 3: Unregister service workers
  onProgress?.(3, totalSteps, 'Avregistrerar service workers...');
  await unregisterAllServiceWorkers();
  await new Promise(resolve => setTimeout(resolve, 400));
  
  // Step 4: Clear version
  onProgress?.(4, totalSteps, 'Slutför...');
  localStorage.removeItem(VERSION_KEY);
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Step 5: Complete
  onProgress?.(5, totalSteps, 'Klart! Laddar om...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  window.location.reload();
};
