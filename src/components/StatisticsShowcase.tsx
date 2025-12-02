import { motion } from "framer-motion";
import { TrendingUp, Flame, Trophy, Calendar, Target, Zap, Activity, Timer, Route } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const StatisticsShowcase = () => {
  // Sample data for charts
  const weeklyWorkouts = [
    { week: "V43", workouts: 2, minutes: 90 },
    { week: "V44", workouts: 3, minutes: 135 },
    { week: "V45", workouts: 3, minutes: 150 },
    { week: "V46", workouts: 4, minutes: 180 },
    { week: "V47", workouts: 4, minutes: 200 },
    { week: "V48", workouts: 5, minutes: 225 },
  ];

  const exerciseProgress = [
    { month: "Sep", weight: 70 },
    { month: "Okt", weight: 77.5 },
    { month: "Nov", weight: 85 },
    { month: "Dec", weight: 90 },
  ];

  const cardioStats = [
    { week: "V45", distance: 12, time: 65 },
    { week: "V46", distance: 15, time: 78 },
    { week: "V47", distance: 18, time: 92 },
    { week: "V48", distance: 22, time: 110 },
  ];

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gym-orange/5 blur-[150px] rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gym-amber/5 blur-[120px] rounded-full" />

      <div className="container px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            SE DIN <span className="text-gradient">UTVECKLING</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Kraftfulla visualiseringar som hjälper dig förstå och optimera din träning över tid.
          </p>
        </motion.div>

        {/* Main Statistics Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          
          {/* Workout Frequency Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">Träningsfrekvens</h3>
              <div className="flex items-center gap-1 text-emerald-500 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>+40%</span>
              </div>
            </div>
            
            <div className="flex items-end gap-2 h-32 mb-4">
              {weeklyWorkouts.map((week, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: `${(week.workouts / 5) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="w-full bg-gradient-to-t from-gym-orange to-gym-amber rounded-t min-h-[8px]"
                  />
                  <span className="text-xs text-muted-foreground">{week.week}</span>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <div className="text-2xl font-display font-bold">21</div>
                <div className="text-xs text-muted-foreground">Pass totalt</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-display font-bold">980</div>
                <div className="text-xs text-muted-foreground">Minuter</div>
              </div>
            </div>
          </motion.div>

          {/* Strength Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">Bänkpress</h3>
              <div className="bg-gym-orange/10 px-2 py-1 rounded text-xs font-medium text-gym-orange">
                PR: 90 kg
              </div>
            </div>
            
            <div className="relative h-32 mb-4">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {[90, 80, 70].map((val) => (
                  <div key={val} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-8">{val}kg</span>
                    <div className="flex-1 border-b border-border/50 border-dashed" />
                  </div>
                ))}
              </div>
              
              {/* Line chart */}
              <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                <motion.path
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5 }}
                  d="M 20 80 L 70 65 L 130 40 L 180 20"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--gym-orange))" />
                    <stop offset="100%" stopColor="hsl(var(--gym-amber))" />
                  </linearGradient>
                </defs>
                
                {/* Data points */}
                {exerciseProgress.map((point, index) => (
                  <motion.circle
                    key={index}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    cx={20 + index * 53}
                    cy={80 - ((point.weight - 70) / 20) * 60}
                    r="5"
                    fill="hsl(var(--gym-orange))"
                  />
                ))}
              </svg>
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground">
              {exerciseProgress.map((point, index) => (
                <span key={index}>{point.month}</span>
              ))}
            </div>
          </motion.div>

          {/* Level & XP Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-semibold">Din nivå</h3>
              <div className="flex items-center gap-1 text-gym-amber">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">2,450 XP</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gym-orange to-gym-amber flex items-center justify-center shadow-lg shadow-gym-orange/20">
                <span className="text-2xl font-display font-bold text-primary-foreground">12</span>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Nivå 12</span>
                  <span className="text-muted-foreground">450/800 XP</span>
                </div>
                <Progress value={56} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">350 XP till nivå 13</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gym-amber" />
                  <span>Achievements</span>
                </div>
                <span className="font-medium">8/24</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-gym-orange" />
                  <span>Bästa streak</span>
                </div>
                <span className="font-medium">14 dagar</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Second Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          
          {/* Cardio Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="bg-card border border-border rounded-xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">Kardio denna månad</h3>
              <Activity className="w-5 h-5 text-gym-orange" />
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <Route className="w-5 h-5 text-gym-orange mx-auto mb-2" />
                <div className="text-2xl font-display font-bold">67</div>
                <div className="text-xs text-muted-foreground">km totalt</div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <Timer className="w-5 h-5 text-gym-orange mx-auto mb-2" />
                <div className="text-2xl font-display font-bold">345</div>
                <div className="text-xs text-muted-foreground">minuter</div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <Calendar className="w-5 h-5 text-gym-orange mx-auto mb-2" />
                <div className="text-2xl font-display font-bold">12</div>
                <div className="text-xs text-muted-foreground">pass</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Löpning</span>
                <span className="text-sm font-medium">42 km</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: "63%" }}
                  viewport={{ once: true }}
                  className="bg-gradient-to-r from-gym-orange to-gym-amber h-2 rounded-full"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Cykling</span>
                <span className="text-sm font-medium">18 km</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: "27%" }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-r from-gym-orange to-gym-amber h-2 rounded-full"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Simning</span>
                <span className="text-sm font-medium">7 km</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: "10%" }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-r from-gym-orange to-gym-amber h-2 rounded-full"
                />
              </div>
            </div>
          </motion.div>

          {/* Goals & Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold">Aktiva mål</h3>
              <Target className="w-5 h-5 text-gym-orange" />
            </div>
            
            <div className="space-y-4">
              {/* Goal 1 */}
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Bänkpress 100 kg</span>
                  <span className="text-xs bg-gym-orange/10 text-gym-orange px-2 py-1 rounded">90%</span>
                </div>
                <Progress value={90} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">Nuvarande: 90 kg • Mål: 100 kg</p>
              </div>
              
              {/* Goal 2 */}
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Spring 100 km/månad</span>
                  <span className="text-xs bg-gym-amber/10 text-gym-amber px-2 py-1 rounded">67%</span>
                </div>
                <Progress value={67} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">Nuvarande: 67 km • 33 km kvar</p>
              </div>
              
              {/* Goal 3 */}
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">4 pass/vecka</span>
                  <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded">✓ Klart!</span>
                </div>
                <Progress value={100} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground">5/4 pass denna vecka</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gym-orange to-gym-amber flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Senaste achievement</p>
                  <p className="text-xs text-muted-foreground">"Månadslöpare" - Spring 50+ km på en månad</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default StatisticsShowcase;
