import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, ArrowRight, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PaymentCanceled() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-border">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center"
            >
              <XCircle className="w-10 h-10 text-muted-foreground" />
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-2xl font-display font-bold">Betalning avbruten</h1>
              <p className="text-muted-foreground">
                Din betalning genomfördes inte. Du kan prova igen när du vill.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="w-full bg-gradient-to-r from-gym-orange to-amber-500 hover:from-gym-orange/90 hover:to-amber-500/90"
              >
                <Crown className="w-4 h-4 mr-2" />
                Prova Premium igen
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/dashboard')} 
                className="w-full"
              >
                Gå till Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
