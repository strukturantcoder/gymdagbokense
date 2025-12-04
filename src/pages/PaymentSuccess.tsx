import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Crown, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import confetti from 'canvas-confetti';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { checkSubscription, session } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(true);

  useEffect(() => {
    // Trigger confetti celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f97316', '#fbbf24', '#10b981']
    });

    // Refresh subscription status
    const refresh = async () => {
      if (session?.access_token) {
        await checkSubscription(session.access_token);
      }
      setIsRefreshing(false);
    };
    refresh();
  }, [checkSubscription, session?.access_token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-card">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center"
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-2xl font-display font-bold">Välkommen till Premium!</h1>
              <p className="text-muted-foreground">
                Tack för din prenumeration. Din betalning har genomförts.
              </p>
            </div>

            <div className="bg-gradient-to-r from-gym-orange/10 to-amber-500/10 rounded-lg p-4 border border-gym-orange/20">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-gym-orange" />
                <span className="font-semibold text-gym-orange">Premium-fördelar</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Ingen reklam i appen</li>
                <li>✓ Stöd utvecklingen av Gymdagboken</li>
                <li>✓ Prioriterad support</li>
              </ul>
            </div>

            {isRefreshing ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Uppdaterar din status...</span>
              </div>
            ) : (
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="w-full bg-gradient-to-r from-gym-orange to-amber-500 hover:from-gym-orange/90 hover:to-amber-500/90"
              >
                Gå till Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
