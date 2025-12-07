import { useEffect, useRef, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const PWAUpdateNotification = () => {
  const { t } = useTranslation();
  const hasShownToast = useRef(false);
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log('SW registered:', swUrl);
      swRegistration.current = r || null;
      
      if (r) {
        // Check for updates immediately on registration
        r.update();
        
        // Check for updates every 30 seconds when app is active
        setInterval(() => {
          r.update();
        }, 30 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  // Check for updates when app becomes visible (user returns to app)
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && swRegistration.current) {
      console.log('App became visible, checking for updates...');
      swRegistration.current.update();
    }
  }, []);

  // Check for updates when coming back online
  const handleOnline = useCallback(() => {
    if (swRegistration.current) {
      console.log('Back online, checking for updates...');
      swRegistration.current.update();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    
    // Also check on focus (covers more cases)
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [handleVisibilityChange, handleOnline]);

  useEffect(() => {
    if (needRefresh && !hasShownToast.current) {
      hasShownToast.current = true;
      
      // Auto-update without requiring user interaction
      updateServiceWorker(true);
      
      // Show a brief notification that update is happening
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

      // Show success message after update
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
      }, 2500);
    }
  }, [needRefresh, updateServiceWorker, t]);

  return null;
};
