import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link2, Copy, Check, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface TeamInviteLinkDialogProps {
  teamId: string;
  teamName: string;
}

interface InviteLink {
  id: string;
  code: string;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

export const TeamInviteLinkDialog = ({ teamId, teamName }: TeamInviteLinkDialogProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const fetchExistingLink = async () => {
    if (!teamId) return;
    
    const { data } = await supabase
      .from('team_invite_links')
      .select('*')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setInviteLink(data as InviteLink);
    }
  };

  useEffect(() => {
    if (open) {
      fetchExistingLink();
    }
  }, [open, teamId]);

  const createInviteLink = async () => {
    if (!user) return;
    
    setLoading(true);
    const code = generateCode();

    const { data, error } = await supabase
      .from('team_invite_links')
      .insert({
        team_id: teamId,
        code,
        created_by: user.id
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error('Kunde inte skapa inbjudningslänk');
      return;
    }

    setInviteLink(data as InviteLink);
    toast.success('Inbjudningslänk skapad!');
  };

  const regenerateLink = async () => {
    if (!inviteLink || !user) return;

    setLoading(true);

    // Deactivate old link
    await supabase
      .from('team_invite_links')
      .update({ is_active: false })
      .eq('id', inviteLink.id);

    // Create new link
    const code = generateCode();
    const { data, error } = await supabase
      .from('team_invite_links')
      .insert({
        team_id: teamId,
        code,
        created_by: user.id
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error('Kunde inte skapa ny inbjudningslänk');
      return;
    }

    setInviteLink(data as InviteLink);
    toast.success('Ny inbjudningslänk skapad!');
  };

  const getFullLink = () => {
    if (!inviteLink) return '';
    return `${window.location.origin}/join-team/${inviteLink.code}`;
  };

  const copyToClipboard = async () => {
    const link = getFullLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Länk kopierad!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kunde inte kopiera länk');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2 className="h-4 w-4" />
          Dela länk
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bjud in till {teamName}</DialogTitle>
          <DialogDescription>
            Dela denna länk för att bjuda in nya medlemmar till laget. Alla med länken kan gå med direkt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {inviteLink ? (
            <>
              <div className="space-y-2">
                <Label>Inbjudningslänk</Label>
                <div className="flex gap-2">
                  <Input 
                    value={getFullLink()} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{inviteLink.uses_count} har använt denna länk</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2"
                  onClick={regenerateLink}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Skapa ny länk
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Om du skapar en ny länk slutar den gamla att fungera.
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">
                Skapa en inbjudningslänk som vem som helst kan använda för att gå med i laget.
              </p>
              <Button onClick={createInviteLink} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Skapa inbjudningslänk
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
