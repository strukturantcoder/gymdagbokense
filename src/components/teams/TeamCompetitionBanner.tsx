import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Gift, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export const TeamCompetitionBanner = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      <Card className="overflow-hidden border-2 border-gym-orange/50 bg-gradient-to-r from-gym-orange/10 via-gym-amber/10 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="shrink-0"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-gym-orange to-gym-amber rounded-full flex items-center justify-center">
                <Trophy className="h-8 w-8 text-white" />
              </div>
            </motion.div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <h3 className="text-xl font-bold">Bygg ditt lag!</h3>
                <Badge className="bg-gym-orange text-white animate-pulse">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Tävling
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Skapa ett lag och bjud in dina vänner! Lagledaren med flest inbjudna som går med vinner ett 
                <span className="font-semibold text-primary"> träningsrelaterat pris</span> 🎁
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
                <span className="font-medium">Max 10</span>
                <p className="text-xs">per lag</p>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <Gift className="h-5 w-5 mx-auto mb-1 text-gym-orange" />
                <span className="font-medium">Pris</span>
                <p className="text-xs">till vinnaren</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
