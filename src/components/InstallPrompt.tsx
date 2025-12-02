import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone, Share, Plus, MoreVertical } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Export for use in other components
export let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // Check if dismissed recently
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return; // 7 days
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);
      globalDeferredPrompt = event;
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show iOS prompt after delay
    if (isIOSDevice) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
    globalDeferredPrompt = null;
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md"
      >
        <div className="bg-card border border-border rounded-xl p-4 shadow-2xl">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-gym-orange to-gym-amber rounded-xl flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-bold text-foreground">
                Installera appen
              </h3>
              
              {isIOS ? (
                <div className="mt-2">
                  {!showIOSSteps ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Installera Gymdagboken på din hemskärm för snabb åtkomst!
                      </p>
                      <Button
                        variant="hero"
                        size="sm"
                        className="mt-3"
                        onClick={() => setShowIOSSteps(true)}
                      >
                        Visa hur
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-3 mt-2">
                      <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                          1
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span>Tryck på</span>
                          <Share className="w-5 h-5 text-primary" />
                          <span className="font-medium">Dela</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                          2
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span>Scrolla och välj</span>
                          <Plus className="w-5 h-5 text-primary" />
                          <span className="font-medium">Lägg till på hemskärm</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                          3
                        </div>
                        <div className="text-sm">
                          <span>Tryck på</span>
                          <span className="font-medium text-primary"> Lägg till</span>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        💡 Dela-knappen finns i Safari's verktygsfält längst ner
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mt-1">
                    Lägg till Gymdagboken på din hemskärm för snabb åtkomst
                  </p>
                  
                  {deferredPrompt ? (
                    <Button
                      variant="hero"
                      size="sm"
                      className="mt-3"
                      onClick={handleInstall}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Installera
                    </Button>
                  ) : (
                    <div className="space-y-3 mt-2">
                      <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                          1
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span>Tryck på</span>
                          <MoreVertical className="w-5 h-5 text-primary" />
                          <span className="font-medium">menyn</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                          2
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span>Välj</span>
                          <Download className="w-5 h-5 text-primary" />
                          <span className="font-medium">Installera app</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Reusable install button component
export function InstallAppButton({ className }: { className?: string }) {
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);
    
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    if (!isStandalone && isIOSDevice) {
      setCanInstall(true);
    }

    const handleBeforeInstall = () => {
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    // Check if prompt is already available
    if (globalDeferredPrompt) {
      setCanInstall(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (globalDeferredPrompt) {
      await globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setCanInstall(false);
      }
      globalDeferredPrompt = null;
    }
  };

  if (isInstalled || !canInstall) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleInstall}
        className={className}
      >
        <Download className="w-4 h-4 mr-2" />
        Installera app
      </Button>

      <AnimatePresence>
        {showIOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowIOSModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg">Installera på iPhone</h3>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Tryck på</span>
                    <Share className="w-6 h-6 text-primary" />
                    <span className="font-medium">i Safari</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Välj</span>
                    <Plus className="w-6 h-6 text-primary" />
                    <span className="font-medium">Lägg till på hemskärm</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div>
                    <span>Tryck</span>
                    <span className="font-medium text-primary"> Lägg till</span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mt-4 text-center">
                ⬇️ Dela-knappen finns längst ner i Safari
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
