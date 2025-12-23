import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSocial } from '@/hooks/useSocial';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Dumbbell, LogOut, Users, Swords, Trophy, UserPlus, 
  Check, X, Loader2, ArrowLeft, Bell, Gift, Sparkles, Globe, Target, Archive, ChevronDown, ChevronUp
} from 'lucide-react';
import UserSearch from '@/components/UserSearch';
import ChallengeCard from '@/components/ChallengeCard';
import CreateChallengeDialog from '@/components/CreateChallengeDialog';
import XPProgress from '@/components/XPProgress';
import AchievementsList from '@/components/AchievementsList';
import InviteFriends from '@/components/InviteFriends';
import AdBanner from '@/components/AdBanner';
import { CommunityChallenges } from '@/components/CommunityChallenges';
import { PoolChallenges } from '@/components/PoolChallenges';
import FriendsLeaderboard from '@/components/FriendsLeaderboard';
import { StreakLeaderboard } from '@/components/StreakLeaderboard';
import { TeamsSection } from '@/components/teams/TeamsSection';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100
    }
  }
};

const cardHoverVariants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 10
    }
  }
};

export default function Social() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("friends");
  const [showArchive, setShowArchive] = useState(false);
  const { 
    friends, 
    pendingRequests, 
    challenges, 
    userStats, 
    achievements, 
    userAchievements,
    loading: socialLoading,
    respondToFriendRequest,
    removeFriend,
    respondToChallenge,
    cancelChallenge
  } = useSocial();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading || socialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const pendingChallenges = challenges.filter(c => c.status === 'pending');
  const completedChallenges = challenges.filter(c => c.status === 'completed' || c.status === 'declined');
  const recentCompleted = completedChallenges.slice(0, 3);
  const archivedChallenges = completedChallenges.slice(3);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gym-orange/5 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
        className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50"
      >
        <div className="container px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </motion.div>
            <motion.div 
              className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <Dumbbell className="w-6 h-6 text-primary-foreground" />
            </motion.div>
            <motion.span 
              className="font-display text-xl font-bold"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              SOCIALT
            </motion.span>
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {pendingRequests.length > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  <Badge variant="destructive" className="animate-pulse">
                    {pendingRequests.length} nya
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Logga ut
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      <main className="container px-4 py-8 relative z-10">
        {/* Ad Banner - horizontal */}
        <AdBanner format="horizontal" placement="social_top" className="mb-6" />
        
        {/* XP Card */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="mb-8"
        >
          <motion.div
            animate={{
              boxShadow: [
                "0 0 20px rgba(249, 115, 22, 0.2)",
                "0 0 40px rgba(249, 115, 22, 0.4)",
                "0 0 20px rgba(249, 115, 22, 0.2)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-xl"
          >
            <Card className="border-primary/50 bg-gradient-to-b from-primary/10 to-card overflow-hidden relative">
              {/* Sparkle effects */}
              <motion.div
                className="absolute top-4 right-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-6 h-6 text-gym-orange/50" />
              </motion.div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Trophy className="w-5 h-5 text-gym-orange" />
                  </motion.div>
                  Din framgång
                </CardTitle>
              </CardHeader>
              <CardContent>
                <XPProgress stats={userStats} />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
          <TabsList className="flex flex-wrap justify-center gap-1 sm:grid sm:grid-cols-6 w-full bg-secondary/50 backdrop-blur-sm p-1 h-auto">
              {[
                { value: "friends", label: "Vänner", badge: pendingRequests.length },
                { value: "teams", label: "Lag", badge: 0 },
                { value: "challenges", label: "Utmaningar", badge: pendingChallenges.filter(c => c.challenged_id === user?.id).length },
                { value: "pool", label: "Matchning", badge: 0 },
                { value: "community", label: "Tävlingar", badge: 0 },
                { value: "achievements", label: "Prestationer", badge: 0 }
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.value}
                  value={tab.value} 
                  className="relative text-xs sm:text-sm font-medium px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                >
                  {tab.label}
                  <AnimatePresence>
                    {tab.badge > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1"
                      >
                        <Badge variant="destructive" className="h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center text-[10px] sm:text-xs">
                          {tab.badge}
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </TabsTrigger>
              ))}
            </TabsList>
          </motion.div>

          {/* Teams Tab */}
          <TabsContent value="teams" className="space-y-6">
            <TeamsSection />
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              {/* Leaderboard */}
              <motion.div variants={itemVariants}>
                <FriendsLeaderboard />
              </motion.div>

              {/* Streak Leaderboard */}
              <motion.div variants={itemVariants}>
                <StreakLeaderboard />
              </motion.div>

              {/* Invite Friends Card */}
              {user && (
                <motion.div variants={itemVariants}>
                  <InviteFriends userId={user.id} />
                </motion.div>
              )}

              <motion.div variants={itemVariants} whileHover="hover" initial="rest">
                <motion.div variants={cardHoverVariants}>
                  <Card className="transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <motion.div
                          animate={{ y: [0, -3, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <UserPlus className="w-5 h-5" />
                        </motion.div>
                        Sök användare
                      </CardTitle>
                      <CardDescription>
                        Sök efter vänner via namn eller e-post
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <UserSearch />
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Pending Requests */}
              <AnimatePresence>
                {pendingRequests.length > 0 && (
                  <motion.div
                    variants={itemVariants}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                  >
                    <Card className="border-gym-orange/50 bg-gradient-to-r from-gym-orange/5 to-transparent">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <motion.div
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                          >
                            <Bell className="w-5 h-5 text-gym-orange" />
                          </motion.div>
                          Vänförfrågningar
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {pendingRequests.map((request, index) => (
                          <motion.div 
                            key={request.id} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.02, backgroundColor: "rgba(249, 115, 22, 0.1)" }}
                            className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                transition={{ type: "spring", stiffness: 400 }}
                              >
                                <Avatar className="ring-2 ring-gym-orange/50">
                                  <AvatarImage src={request.user_profile?.avatar_url || undefined} />
                                  <AvatarFallback className="bg-gym-orange/20">
                                    {request.user_profile?.display_name?.slice(0, 2).toUpperCase() || '??'}
                                  </AvatarFallback>
                                </Avatar>
                              </motion.div>
                              <span className="font-medium">{request.user_profile?.display_name || 'Anonym'}</span>
                            </div>
                            <div className="flex gap-2">
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button size="sm" variant="hero" onClick={() => respondToFriendRequest(request.id, true)}>
                                  <Check className="w-4 h-4" />
                                </Button>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button size="sm" variant="outline" onClick={() => respondToFriendRequest(request.id, false)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </motion.div>
                            </div>
                          </motion.div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Friends List */}
              <motion.div variants={itemVariants}>
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Mina vänner 
                      <motion.span
                        key={friends.length}
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-primary"
                      >
                        ({friends.length})
                      </motion.span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {friends.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8"
                      >
                        <motion.div
                          animate={{ y: [0, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        </motion.div>
                        <p className="text-muted-foreground">
                          Du har inga vänner än. Sök efter användare ovan!
                        </p>
                      </motion.div>
                    ) : (
                      <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-3"
                      >
                        {friends.map((friend, index) => (
                          <motion.div 
                            key={friend.id}
                            variants={itemVariants}
                            whileHover={{ scale: 1.02, x: 5 }}
                            className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg transition-all duration-300 hover:bg-secondary/80 hover:shadow-md"
                          >
                            <div className="flex items-center gap-3">
                              <motion.div
                                whileHover={{ scale: 1.15, rotate: 5 }}
                                transition={{ type: "spring", stiffness: 400 }}
                              >
                                <Avatar className="ring-2 ring-transparent hover:ring-primary/50 transition-all">
                                  <AvatarImage src={friend.friend_profile?.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {friend.friend_profile?.display_name?.slice(0, 2).toUpperCase() || '??'}
                                  </AvatarFallback>
                                </Avatar>
                              </motion.div>
                              <span className="font-medium">{friend.friend_profile?.display_name || 'Anonym'}</span>
                            </div>
                            <div className="flex gap-2">
                              <CreateChallengeDialog 
                                friends={[friend]} 
                                trigger={
                                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button size="sm" variant="outline" className="group">
                                      <motion.div
                                        className="mr-2"
                                        animate={{ rotate: [0, 10, -10, 0] }}
                                        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                                      >
                                        <Swords className="w-4 h-4 group-hover:text-primary transition-colors" />
                                      </motion.div>
                                      Utmana
                                    </Button>
                                  </motion.div>
                                }
                              />
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => removeFriend(friend.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </motion.div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <motion.div 
                variants={itemVariants}
                className="flex justify-between items-center"
              >
                <h2 className="text-xl font-display font-bold flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 4 }}
                  >
                    <Swords className="w-6 h-6 text-primary" />
                  </motion.div>
                  Utmaningar
                </h2>
                {friends.length > 0 && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <CreateChallengeDialog friends={friends} />
                  </motion.div>
                )}
              </motion.div>

              <AnimatePresence>
                {friends.length === 0 && (
                  <motion.div
                    variants={itemVariants}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Card className="border-dashed">
                      <CardContent className="py-8 text-center">
                        <motion.div
                          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        </motion.div>
                        <p className="text-muted-foreground">
                          Lägg till vänner för att kunna utmana dem!
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pending Challenges */}
              <AnimatePresence>
                {pendingChallenges.length > 0 && (
                  <motion.div 
                    variants={itemVariants}
                    className="space-y-4"
                  >
                    <h3 className="font-medium text-muted-foreground flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <div className="w-2 h-2 bg-gym-orange rounded-full" />
                      </motion.div>
                      Väntar på svar
                    </h3>
                    {pendingChallenges.map((challenge, index) => (
                      <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <ChallengeCard
                          challenge={challenge}
                          onAccept={() => respondToChallenge(challenge.id, true)}
                          onDecline={() => respondToChallenge(challenge.id, false)}
                          onCancel={() => cancelChallenge(challenge.id)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Active Challenges */}
              <AnimatePresence>
                {activeChallenges.length > 0 && (
                  <motion.div 
                    variants={itemVariants}
                    className="space-y-4"
                  >
                    <h3 className="font-medium text-muted-foreground flex items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-2 h-2 bg-green-500 rounded-full"
                      />
                      Aktiva utmaningar
                    </h3>
                    {activeChallenges.map((challenge, index) => (
                      <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <ChallengeCard 
                          challenge={challenge} 
                          onCancel={() => cancelChallenge(challenge.id)}
                        />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Completed Challenges - Recent */}
              <AnimatePresence>
                {recentCompleted.length > 0 && (
                  <motion.div 
                    variants={itemVariants}
                    className="space-y-4"
                  >
                    <h3 className="font-medium text-muted-foreground flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-gym-amber" />
                      Nyligen avslutade
                    </h3>
                    {recentCompleted.map((challenge, index) => (
                      <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <ChallengeCard challenge={challenge} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Archive Section */}
              <AnimatePresence>
                {archivedChallenges.length > 0 && (
                  <motion.div 
                    variants={itemVariants}
                    className="space-y-4"
                  >
                    <Button
                      variant="ghost"
                      className="w-full justify-between text-muted-foreground hover:text-foreground"
                      onClick={() => setShowArchive(!showArchive)}
                    >
                      <span className="flex items-center gap-2">
                        <Archive className="w-4 h-4" />
                        Arkiv ({archivedChallenges.length} äldre utmaningar)
                      </span>
                      {showArchive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    
                    <AnimatePresence>
                      {showArchive && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-4 overflow-hidden"
                        >
                          {archivedChallenges.map((challenge, index) => (
                            <motion.div
                              key={challenge.id}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ scale: 1.01 }}
                            >
                              <ChallengeCard challenge={challenge} />
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {challenges.length === 0 && friends.length > 0 && (
                <motion.div variants={itemVariants}>
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Swords className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      </motion.div>
                      <p className="text-muted-foreground">
                        Inga utmaningar än. Utmana en vän!
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <motion.div 
                variants={itemVariants}
                className="flex justify-between items-center"
              >
                <div>
                  <h2 className="text-xl font-display font-bold flex items-center gap-2">
                    <motion.div
                      animate={{ 
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Trophy className="w-6 h-6 text-gym-amber" />
                    </motion.div>
                    Prestationer
                  </h2>
                  <motion.p 
                    className="text-sm text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <motion.span
                      key={userAchievements.length}
                      initial={{ scale: 1.5, color: "rgb(249, 115, 22)" }}
                      animate={{ scale: 1, color: "inherit" }}
                      className="font-bold"
                    >
                      {userAchievements.length}
                    </motion.span>
                    {" / "}
                    {achievements.length} upplåsta
                  </motion.p>
                </div>
              </motion.div>
              <motion.div variants={itemVariants}>
                <AchievementsList achievements={achievements} userAchievements={userAchievements} />
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* Community Challenges Tab */}
          <TabsContent value="community" className="space-y-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <motion.div variants={itemVariants}>
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Globe className="w-6 h-6 text-primary" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-foreground">Community-tävlingar</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Delta i öppna tävlingar och tävla mot andra användare!
                </p>
              </motion.div>
              <motion.div variants={itemVariants}>
                <CommunityChallenges />
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* Pool Challenges Tab */}
          <TabsContent value="pool" className="space-y-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6"
            >
              <motion.div variants={itemVariants}>
                <div className="flex items-center gap-3 mb-2">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Target className="w-6 h-6 text-primary" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-foreground">Hitta motståndare</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Tävla mot okända motståndare och vinn XP!
                </p>
              </motion.div>
              <motion.div variants={itemVariants}>
                <PoolChallenges />
              </motion.div>
            </motion.div>
          </TabsContent>
        </Tabs>
        
        {/* Square medium ad */}
        <div className="flex justify-center my-8">
          <AdBanner format="square_medium" placement="social_square" showPremiumPrompt={false} />
        </div>
        
        {/* Bottom Ad Banner - horizontal */}
        <AdBanner format="horizontal" placement="social_bottom" className="mt-8" />
      </main>
    </div>
  );
}
