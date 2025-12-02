import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Share2, Users, Gift } from "lucide-react";
import { toast } from "sonner";

interface InviteFriendsProps {
  userId: string;
  compact?: boolean;
}

export default function InviteFriends({ userId, compact = false }: InviteFriendsProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchOrCreateInviteCode();
      fetchReferralCount();
    }
  }, [userId]);

  const generateCode = () => {
    // Generate a short, readable invite code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const fetchOrCreateInviteCode = async () => {
    try {
      // First try to fetch existing code
      const { data: existing, error: fetchError } = await supabase
        .from('invite_codes')
        .select('code')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        setInviteCode(existing.code);
      } else {
        // Create new invite code
        const newCode = generateCode();
        const { error: insertError } = await supabase
          .from('invite_codes')
          .insert({ user_id: userId, code: newCode });

        if (insertError) throw insertError;
        setInviteCode(newCode);
      }
    } catch (error) {
      console.error('Error with invite code:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferralCount = async () => {
    try {
      const { count, error } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('inviter_id', userId);

      if (!error && count !== null) {
        setReferralCount(count);
      }
    } catch (error) {
      console.error('Error fetching referral count:', error);
    }
  };

  const getInviteUrl = () => {
    if (!inviteCode) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth?ref=${inviteCode}`;
  };

  const copyToClipboard = async () => {
    const url = getInviteUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Inbjudningslänk kopierad!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Kunde inte kopiera länken');
    }
  };

  const shareLink = async () => {
    const url = getInviteUrl();
    const shareData = {
      title: 'Gymdagboken - Bjud in',
      text: 'Kom och träna med mig på Gymdagboken! Spåra din träning och tävla mot vänner.',
      url: url,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error - fallback to copy
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-secondary/30 rounded-xl h-32" />
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={getInviteUrl()}
          readOnly
          className="text-sm bg-secondary/50"
        />
        <Button size="icon" variant="outline" onClick={copyToClipboard}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button size="icon" onClick={shareLink}>
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-gym-orange/20 bg-gradient-to-br from-gym-orange/5 to-gym-amber/5">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gym-orange to-gym-amber flex items-center justify-center">
            <Gift className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Bjud in vänner</CardTitle>
            <CardDescription>Dela din länk och träna tillsammans</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={getInviteUrl()}
            readOnly
            className="bg-background/50 text-sm font-mono"
          />
          <Button 
            variant="outline" 
            size="icon"
            onClick={copyToClipboard}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <Button 
          onClick={shareLink} 
          className="w-full bg-gradient-to-r from-gym-orange to-gym-amber hover:opacity-90"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Dela inbjudningslänk
        </Button>

        {referralCount > 0 && (
          <div className="flex items-center justify-center gap-2 pt-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Du har bjudit in <span className="font-semibold text-gym-orange">{referralCount}</span> vänner!</span>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Din inbjudningskod: <span className="font-mono font-semibold">{inviteCode}</span>
        </p>
      </CardContent>
    </Card>
  );
}
