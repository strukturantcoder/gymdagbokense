import { motion } from "framer-motion";
import { Trophy, Users, Swords, Crown, Medal, Flame, TrendingUp, Target, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const SocialShowcase = () => {
  const leaderboard = [
    { rank: 1, name: "Erik S", xp: 4250, level: 18, avatar: "ES", streak: 21 },
    { rank: 2, name: "Anna K", xp: 3890, level: 16, avatar: "AK", streak: 14 },
    { rank: 3, name: "Marcus L", xp: 3540, level: 15, avatar: "ML", streak: 8 },
    { rank: 4, name: "Lisa P", xp: 2980, level: 13, avatar: "LP", streak: 5 },
    { rank: 5, name: "Johan B", xp: 2450, level: 12, avatar: "JB", streak: 3 },
  ];

  const activeChallenges = [
    {
      type: "workouts",
      challenger: { name: "Erik S", avatar: "ES", progress: 8 },
      challenged: { name: "Anna K", avatar: "AK", progress: 7 },
      target: 10,
      daysLeft: 4,
      title: "Flest träningspass",
    },
    {
      type: "minutes",
      challenger: { name: "Marcus L", avatar: "ML", progress: 320 },
      challenged: { name: "Lisa P", avatar: "LP", progress: 285 },
      target: 400,
      daysLeft: 8,
      title: "Mest träningstid",
    },
  ];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm text-muted-foreground">{rank}</span>;
  };

  return (
    <section className="py-24 bg-secondary/20 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-gym-orange/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-gym-amber/5 blur-[100px] rounded-full" />

      <div className="container px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-gym-orange/10 border border-gym-orange/20 rounded-full px-4 py-2 mb-6">
            <Swords className="w-4 h-4 text-gym-orange" />
            <span className="text-sm font-medium text-gym-orange">Tävla med vänner</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            UTMANA & <span className="text-gradient">VINN</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Bjud in dina vänner och tävla mot varandra i olika utmaningar. Se vem som tränar mest!
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-xl p-6 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gym-orange to-gym-amber flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">Topplista</h3>
                  <p className="text-xs text-muted-foreground">Dina vänner</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm">5 vänner</span>
              </div>
            </div>

            <div className="space-y-3">
              {leaderboard.map((user, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    user.rank === 1 
                      ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20' 
                      : 'bg-secondary/30 hover:bg-secondary/50'
                  }`}
                >
                  <div className="w-8 flex justify-center">
                    {getRankIcon(user.rank)}
                  </div>
                  
                  <Avatar className="h-10 w-10 border-2 border-border">
                    <AvatarFallback className={user.rank === 1 ? 'bg-gradient-to-br from-gym-orange to-gym-amber text-primary-foreground' : 'bg-secondary'}>
                      {user.avatar}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{user.name}</span>
                      {user.streak > 7 && (
                        <div className="flex items-center gap-1 text-gym-orange">
                          <Flame className="w-3 h-3" />
                          <span className="text-xs">{user.streak}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">Nivå {user.level}</div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-display font-bold text-gym-orange">{user.xp.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">XP</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Din position</span>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium">Du är #5 – 530 XP till #4!</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Active Challenges */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gym-orange to-gym-amber flex items-center justify-center">
                <Swords className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold">Aktiva utmaningar</h3>
                <p className="text-xs text-muted-foreground">2 pågående</p>
              </div>
            </div>

            {activeChallenges.map((challenge, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + index * 0.15 }}
                className="bg-card border border-border rounded-xl p-5 shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gym-orange" />
                    <span className="font-medium">{challenge.title}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground bg-secondary/50 px-2 py-1 rounded text-xs">
                    <Clock className="w-3 h-3" />
                    <span>{challenge.daysLeft} dagar kvar</span>
                  </div>
                </div>

                {/* VS Battle */}
                <div className="flex items-center gap-4 mb-4">
                  {/* Challenger */}
                  <div className="flex-1 text-center">
                    <Avatar className="h-14 w-14 mx-auto mb-2 border-2 border-gym-orange">
                      <AvatarFallback className="bg-gradient-to-br from-gym-orange to-gym-amber text-primary-foreground">
                        {challenge.challenger.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-medium text-sm">{challenge.challenger.name}</p>
                    <p className="text-2xl font-display font-bold text-gym-orange">
                      {challenge.challenger.progress}
                    </p>
                  </div>

                  {/* VS */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                      <span className="font-display font-bold text-lg">VS</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Mål: {challenge.target}
                    </span>
                  </div>

                  {/* Challenged */}
                  <div className="flex-1 text-center">
                    <Avatar className="h-14 w-14 mx-auto mb-2 border-2 border-border">
                      <AvatarFallback className="bg-secondary">
                        {challenge.challenged.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <p className="font-medium text-sm">{challenge.challenged.name}</p>
                    <p className="text-2xl font-display font-bold">
                      {challenge.challenged.progress}
                    </p>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-16 text-right">{challenge.challenger.name.split(' ')[0]}</span>
                    <div className="flex-1">
                      <Progress 
                        value={(challenge.challenger.progress / challenge.target) * 100} 
                        className="h-2"
                      />
                    </div>
                    <span className="text-xs w-10">{Math.round((challenge.challenger.progress / challenge.target) * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-16 text-right">{challenge.challenged.name.split(' ')[0]}</span>
                    <div className="flex-1 [&>div>div]:bg-muted-foreground">
                      <Progress 
                        value={(challenge.challenged.progress / challenge.target) * 100} 
                        className="h-2"
                      />
                    </div>
                    <span className="text-xs w-10">{Math.round((challenge.challenged.progress / challenge.target) * 100)}%</span>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Create Challenge CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-gym-orange/10 to-gym-amber/10 border border-gym-orange/20 rounded-xl p-5 text-center"
            >
              <Swords className="w-8 h-8 text-gym-orange mx-auto mb-3" />
              <h4 className="font-display font-semibold mb-2">Skapa en utmaning</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Utmana en vän i antal pass, sets eller träningstid!
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="bg-secondary/50 px-3 py-1 rounded-full text-xs">1 vecka</span>
                <span className="bg-secondary/50 px-3 py-1 rounded-full text-xs">2 veckor</span>
                <span className="bg-secondary/50 px-3 py-1 rounded-full text-xs">1 månad</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SocialShowcase;
