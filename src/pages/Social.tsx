import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSocial } from '@/hooks/useSocial';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Dumbbell, LogOut, Users, Swords, Trophy, UserPlus, 
  Check, X, Loader2, ArrowLeft, Bell, Gift
} from 'lucide-react';
import UserSearch from '@/components/UserSearch';
import ChallengeCard from '@/components/ChallengeCard';
import CreateChallengeDialog from '@/components/CreateChallengeDialog';
import XPProgress from '@/components/XPProgress';
import AchievementsList from '@/components/AchievementsList';
import InviteFriends from '@/components/InviteFriends';

export default function Social() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
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
    respondToChallenge
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const pendingChallenges = challenges.filter(c => c.status === 'pending');
  const completedChallenges = challenges.filter(c => c.status === 'completed');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">SOCIALT</span>
          </div>
          <div className="flex items-center gap-2">
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {pendingRequests.length} nya
              </Badge>
            )}
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Logga ut
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        {/* XP Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-primary/50 bg-gradient-to-b from-primary/5 to-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-gym-orange" />
                Din framgång
              </CardTitle>
            </CardHeader>
            <CardContent>
              <XPProgress stats={userStats} />
            </CardContent>
          </Card>
        </motion.div>

        <Tabs defaultValue="friends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Vänner
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="challenges" className="flex items-center gap-2">
              <Swords className="w-4 h-4" />
              Utmaningar
              {pendingChallenges.filter(c => c.challenged_id === user?.id).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                  {pendingChallenges.filter(c => c.challenged_id === user?.id).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Prestationer
            </TabsTrigger>
          </TabsList>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-6">
            {/* Invite Friends Card */}
            {user && <InviteFriends userId={user.id} />}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
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

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <Card className="border-gym-orange/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-gym-orange" />
                    Vänförfrågningar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={request.user_profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {request.user_profile?.display_name?.slice(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{request.user_profile?.display_name || 'Anonym'}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="hero" onClick={() => respondToFriendRequest(request.id, true)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => respondToFriendRequest(request.id, false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Friends List */}
            <Card>
              <CardHeader>
                <CardTitle>Mina vänner ({friends.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {friends.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Du har inga vänner än. Sök efter användare ovan!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={friend.friend_profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {friend.friend_profile?.display_name?.slice(0, 2).toUpperCase() || '??'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{friend.friend_profile?.display_name || 'Anonym'}</span>
                        </div>
                        <div className="flex gap-2">
                          <CreateChallengeDialog 
                            friends={[friend]} 
                            trigger={
                              <Button size="sm" variant="outline">
                                <Swords className="w-4 h-4 mr-2" />
                                Utmana
                              </Button>
                            }
                          />
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive"
                            onClick={() => removeFriend(friend.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-display font-bold">Utmaningar</h2>
              {friends.length > 0 && <CreateChallengeDialog friends={friends} />}
            </div>

            {friends.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Lägg till vänner för att kunna utmana dem!
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Pending Challenges */}
            {pendingChallenges.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-muted-foreground">Väntar på svar</h3>
                {pendingChallenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    onAccept={() => respondToChallenge(challenge.id, true)}
                    onDecline={() => respondToChallenge(challenge.id, false)}
                  />
                ))}
              </div>
            )}

            {/* Active Challenges */}
            {activeChallenges.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-muted-foreground">Aktiva utmaningar</h3>
                {activeChallenges.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </div>
            )}

            {/* Completed Challenges */}
            {completedChallenges.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-muted-foreground">Avslutade</h3>
                {completedChallenges.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </div>
            )}

            {challenges.length === 0 && friends.length > 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Swords className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Inga utmaningar än. Utmana en vän!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-display font-bold">Prestationer</h2>
                <p className="text-sm text-muted-foreground">
                  {userAchievements.length} / {achievements.length} upplåsta
                </p>
              </div>
            </div>
            <AchievementsList achievements={achievements} userAchievements={userAchievements} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}