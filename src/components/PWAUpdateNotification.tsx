import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export const PWAUpdateNotification = () => {
  const { t } = useTranslation();
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
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
    if (needRefresh && !showUpdateToast) {
      setShowUpdateToast(true);
      toast(
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          <div className="flex-1">
            <p className="font-medium">{t('update.available', 'Ny version tillgänglig!')}</p>
            <p className="text-sm text-muted-foreground">
              {t('update.clickToUpdate', 'Klicka för att uppdatera appen')}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              updateServiceWorker(true);
              setShowUpdateToast(false);
            }}
          >
            {t('update.update', 'Uppdatera')}
          </Button>
        </div>,
        {
          duration: Infinity,
          id: 'pwa-update',
          onDismiss: () => {
            setNeedRefresh(false);
            setShowUpdateToast(false);
          },
        }
      );
    }
  }, [needRefresh, showUpdateToast, updateServiceWorker, setNeedRefresh, t]);

  return null;
};
