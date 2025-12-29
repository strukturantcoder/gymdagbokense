import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Share2, Globe, Lock, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ShareProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: {
    id: string;
    name: string;
    is_public?: boolean;
    share_code?: string | null;
    description?: string | null;
  };
  onUpdate: () => void;
}

export function ShareProgramDialog({ open, onOpenChange, program, onUpdate }: ShareProgramDialogProps) {
  const [isPublic, setIsPublic] = useState(program.is_public || false);
  const [description, setDescription] = useState(program.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateShareCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const shareCode = isPublic && !program.share_code ? generateShareCode() : program.share_code;
      
      const { error } = await supabase
        .from('workout_programs')
        .update({
          is_public: isPublic,
          share_code: isPublic ? shareCode : null,
          description: description || null
        })
        .eq('id', program.id);

      if (error) throw error;

      toast.success(isPublic ? 'Programmet är nu publikt!' : 'Programmet är nu privat');
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating program:', error);
      toast.error('Kunde inte uppdatera programmet');
    } finally {
      setIsSaving(false);
    }
  };

  const copyShareLink = async () => {
    const shareUrl = `${window.location.origin}/programs/${program.share_code || generateShareCode()}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Länk kopierad!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Dela program
          </DialogTitle>
          <DialogDescription>
            Gör ditt träningsprogram tillgängligt för andra att kopiera och använda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="w-5 h-5 text-green-500" />
              ) : (
                <Lock className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Publikt program</p>
                <p className="text-sm text-muted-foreground">
                  {isPublic ? 'Alla kan se och kopiera' : 'Endast du kan se'}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {isPublic && (
            <>
              <div className="space-y-2">
                <Label>Beskrivning (valfritt)</Label>
                <Textarea
                  placeholder="Beskriv ditt program för andra användare..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {program.share_code && (
                <div className="space-y-2">
                  <Label>Delningslänk</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/programs/${program.share_code}`}
                      className="text-sm"
                    />
                    <Button variant="outline" size="icon" onClick={copyShareLink}>
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-secondary/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Vad händer när du delar?</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Programmet visas i topplistan om det får likes</li>
                  <li>Andra användare kan kopiera det till sitt konto</li>
                  <li>Du behåller alltid originalet</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Sparar...' : 'Spara'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
