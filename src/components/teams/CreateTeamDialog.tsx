import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Users, Loader2 } from 'lucide-react';

interface CreateTeamDialogProps {
  onCreateTeam: (name: string, description?: string) => Promise<any>;
}

export const CreateTeamDialog = ({ onCreateTeam }: CreateTeamDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const result = await onCreateTeam(name.trim(), description.trim() || undefined);
    setLoading(false);

    if (result) {
      setOpen(false);
      setName('');
      setDescription('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" className="w-full gap-2">
          <Users className="h-4 w-4" />
          Skapa ditt lag
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skapa nytt lag</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Lagnamn</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="T.ex. Team Styrka"
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning (valfritt)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskriv ditt lag..."
              maxLength={200}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Skapa lag'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
