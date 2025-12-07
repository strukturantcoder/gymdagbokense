import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const PWAUpdateNotification = () => {
  const { t } = useTranslation();
  const hasShownToast = useRef(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log('SW registered:', swUrl);
      // Check for updates every 60 seconds
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

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
