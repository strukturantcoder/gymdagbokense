import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  BarChart3, 
  Trophy, 
  Users, 
  Bell, 
  Mail, 
  Megaphone, 
  Image, 
  UsersRound, 
  TrendingUp,
  Shield,
  Crown,
  Loader2
} from "lucide-react";

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, user, navigate]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const adminSections = [
    {
      id: 'stats',
      label: 'Statistik',
      description: 'Användarstatistik',
      icon: BarChart3,
      color: 'from-blue-500/20 to-cyan-500/10',
      borderColor: 'border-blue-500/30 hover:border-blue-500/50',
      iconColor: 'text-blue-500',
      href: '/admin/challenges',
      span: 'col-span-2'
    },
    {
      id: 'engagement',
      label: 'Engagemang',
      description: 'Tävlingsengagemang',
      icon: TrendingUp,
      color: 'from-green-500/20 to-emerald-500/10',
      borderColor: 'border-green-500/30 hover:border-green-500/50',
      iconColor: 'text-green-500',
      href: '/admin/challenges?tab=engagement'
    },
    {
      id: 'challenges',
      label: 'Tävlingar',
      description: 'Hantera tävlingar',
      icon: Trophy,
      color: 'from-yellow-500/20 to-orange-500/10',
      borderColor: 'border-yellow-500/30 hover:border-yellow-500/50',
      iconColor: 'text-yellow-500',
      href: '/admin/challenges?tab=challenges'
    },
    {
      id: 'teams',
      label: 'Lag',
      description: 'Hantera lag',
      icon: UsersRound,
      color: 'from-purple-500/20 to-violet-500/10',
      borderColor: 'border-purple-500/30 hover:border-purple-500/50',
      iconColor: 'text-purple-500',
      href: '/admin/challenges?tab=teams'
    },
    {
      id: 'users',
      label: 'Användare',
      description: 'Hantera användare',
      icon: Users,
      color: 'from-indigo-500/20 to-blue-500/10',
      borderColor: 'border-indigo-500/30 hover:border-indigo-500/50',
      iconColor: 'text-indigo-500',
      href: '/admin/users'
    },
    {
      id: 'premium',
      label: 'Premium',
      description: 'Premium-användare',
      icon: Crown,
      color: 'from-amber-500/20 to-yellow-500/10',
      borderColor: 'border-amber-500/30 hover:border-amber-500/50',
      iconColor: 'text-amber-500',
      href: '/admin/premium'
    },
    {
      id: 'notifications',
      label: 'Notiser',
      description: 'Push-notiser',
      icon: Bell,
      color: 'from-red-500/20 to-rose-500/10',
      borderColor: 'border-red-500/30 hover:border-red-500/50',
      iconColor: 'text-red-500',
      href: '/admin/challenges?tab=notifications'
    },
    {
      id: 'emails',
      label: 'Mejl',
      description: 'E-postkampanjer',
      icon: Mail,
      color: 'from-cyan-500/20 to-teal-500/10',
      borderColor: 'border-cyan-500/30 hover:border-cyan-500/50',
      iconColor: 'text-cyan-500',
      href: '/admin/emails'
    },
    {
      id: 'ads',
      label: 'Annonser',
      description: 'Hantera annonser',
      icon: Megaphone,
      color: 'from-pink-500/20 to-rose-500/10',
      borderColor: 'border-pink-500/30 hover:border-pink-500/50',
      iconColor: 'text-pink-500',
      href: '/admin/ads'
    },
    {
      id: 'instagram',
      label: 'Instagram',
      description: 'AI-bilder',
      icon: Image,
      color: 'from-fuchsia-500/20 to-purple-500/10',
      borderColor: 'border-fuchsia-500/30 hover:border-fuchsia-500/50',
      iconColor: 'text-fuchsia-500',
      href: '/admin/instagram'
    },
  ];

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Hantera din app</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overflow-x-hidden container mx-auto px-4 py-4 pb-20 md:pb-4 space-y-6">
        {/* Bento Grid Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {adminSections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.98 }}
              className={section.span || ''}
            >
              <Card 
                className={`h-28 cursor-pointer bg-gradient-to-br ${section.color} ${section.borderColor} transition-all`}
                onClick={() => navigate(section.href)}
              >
                <CardContent className="p-4 h-full flex flex-col justify-between">
                  <section.icon className={`w-6 h-6 ${section.iconColor}`} />
                  <div>
                    <p className="font-semibold text-sm">{section.label}</p>
                    <p className="text-[10px] text-muted-foreground">{section.description}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
