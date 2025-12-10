import { useEffect, useRef, useCallback, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// App version - increment this when deploying critical updates
export const APP_VERSION = '2.0.1';
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
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const hasShownDialog = useRef(false);
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
      
      if (needRefresh && !hasShownDialog.current) {
        setShowUpdateDialog(true);
        hasShownDialog.current = true;
      }
    }
  }, [needRefresh]);

  // Check for updates when coming back online
  const handleOnline = useCallback(() => {
    console.log('Back online, checking for updates...');
    checkVersionAndUpdate();
    
    if (needRefresh && !hasShownDialog.current) {
      setShowUpdateDialog(true);
      hasShownDialog.current = true;
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

  // Show dialog when needRefresh becomes true
  useEffect(() => {
    if (needRefresh && !hasShownDialog.current) {
      hasShownDialog.current = true;
      setShowUpdateDialog(true);
    }
  }, [needRefresh]);

  // Reset the flag when needRefresh changes to false
  useEffect(() => {
    if (!needRefresh) {
      hasShownDialog.current = false;
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
      setShowUpdateDialog(false);
    }
  };

  return (
    <AlertDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Download className="h-8 w-8 text-primary" />
          </div>
          <AlertDialogTitle className="text-center">
            {t('update.available', 'Ny version tillgänglig!')}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {t('update.description', 'En ny version av Gymdagboken finns tillgänglig. Uppdatera nu för att få de senaste funktionerna och förbättringarna.')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction 
            onClick={handleUpdate} 
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t('update.updating', 'Uppdaterar...')}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {t('update.updateNow', 'Uppdatera nu')}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
