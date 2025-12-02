import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Dumbbell, Mail, Lock, User } from 'lucide-react';

const signUpSchema = z.object({
  displayName: z.string().min(2, 'Namn måste vara minst 2 tecken').max(50, 'Namn får max vara 50 tecken'),
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string().min(6, 'Lösenord måste vara minst 6 tecken'),
});

const signInSchema = z.object({
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string().min(1, 'Lösenord krävs'),
});

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, signUp, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const validation = signUpSchema.safeParse({ displayName, email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('E-postadressen är redan registrerad');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Konto skapat! Välkommen till Gymdagboken!');
        }
      } else {
        const validation = signInSchema.safeParse({ email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Fel e-post eller lösenord');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Inloggad!');
        }
      }
    } catch (err) {
      toast.error('Något gick fel, försök igen');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-primary p-3 rounded-xl">
              <Dumbbell className="h-8 w-8 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-bold text-foreground tracking-tight">
              GYMDAGBOKEN
            </span>
          </div>

          {/* Title */}
          <h1 className="text-xl font-semibold text-center text-foreground mb-6">
            {isSignUp ? 'Skapa konto' : 'Logga in'}
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-foreground">Namn</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Ditt namn"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10 bg-background border-border"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">E-post</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="din@email.se"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-background border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Lösenord</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-background border-border"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? 'Laddar...' : isSignUp ? 'Skapa konto' : 'Logga in'}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              {isSignUp ? 'Har du redan ett konto?' : 'Har du inget konto?'}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="ml-2 text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                {isSignUp ? 'Logga in' : 'Skapa konto'}
              </button>
            </p>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Tillbaka till startsidan
          </button>
        </div>
      </motion.div>
    </div>
  );
}
