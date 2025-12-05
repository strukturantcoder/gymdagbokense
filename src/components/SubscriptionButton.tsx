import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Crown, Loader2, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionButtonProps {
  variant?: "default" | "compact";
  className?: string;
}

const SubscriptionButton = ({ variant = "default", className = "" }: SubscriptionButtonProps) => {
  const { session, isPremium, checkingSubscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    if (!session?.access_token) {
      toast({
        title: "Du måste logga in",
        description: "Logga in för att prenumerera på Premium.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('[Premium] Calling create-checkout...');
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('[Premium] Response:', { data, error });

      if (error) {
        console.error('[Premium] Error from invoke:', error);
        throw error;
      }
      
      if (data?.url) {
        console.log('[Premium] Redirecting to:', data.url);
        window.location.href = data.url;
      } else {
        console.error('[Premium] No URL in response:', data);
        toast({
          title: "Något gick fel",
          description: "Inget betalningslänk returnerades.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[Premium] Error creating checkout:', error);
      toast({
        title: "Något gick fel",
        description: "Kunde inte starta betalningen. Försök igen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        // Use location.href for PWA/mobile compatibility
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Något gick fel",
        description: "Kunde inte öppna prenumerationshanteringen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSubscription) {
    return (
      <Button variant="outline" disabled className={className}>
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Laddar...
      </Button>
    );
  }

  if (isPremium) {
    return (
      <Button 
        variant="outline" 
        onClick={handleManageSubscription}
        disabled={loading}
        className={className}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Settings className="w-4 h-4 mr-2" />
        )}
        Hantera Premium
      </Button>
    );
  }

  if (variant === "compact") {
    return (
      <Button 
        onClick={handleSubscribe}
        disabled={loading}
        className={`bg-gradient-to-r from-gym-orange to-amber-500 hover:from-gym-orange/90 hover:to-amber-500/90 ${className}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Crown className="w-4 h-4 mr-2" />
        )}
        Premium
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleSubscribe}
      disabled={loading}
      size="lg"
      className={`bg-gradient-to-r from-gym-orange to-amber-500 hover:from-gym-orange/90 hover:to-amber-500/90 ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <Crown className="w-4 h-4 mr-2" />
      )}
      Uppgradera till Premium – 19 kr/mån
    </Button>
  );
};

export default SubscriptionButton;
