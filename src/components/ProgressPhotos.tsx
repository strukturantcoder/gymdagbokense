import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Plus, 
  Trash2, 
  Calendar, 
  Scale, 
  ChevronLeft, 
  ChevronRight,
  ImageIcon,
  Loader2,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface ProgressPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  photo_date: string;
  weight_kg: number | null;
  notes: string | null;
  category: string;
  created_at: string;
}

export default function ProgressPhotos() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePhotos, setComparePhotos] = useState<[ProgressPhoto | null, ProgressPhoto | null]>([null, null]);

  // Form state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoDate, setPhotoDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('general');

  const fetchPhotos = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('user_id', user.id)
        .order('photo_date', { ascending: false });

      if (error) throw error;
      setPhotos((data as ProgressPhoto[]) || []);
    } catch (error) {
      console.error('Error fetching progress photos:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error('Vänligen välj en bildfil');
          return;
        }
        setPhotoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreview(reader.result as string);
        };
        reader.onerror = () => {
          toast.error('Kunde inte läsa bilden');
          setPhotoFile(null);
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Error handling file:', error);
      toast.error('Något gick fel vid bildvalet');
    }
  };

  const handleUpload = async () => {
    if (!user || !photoFile) {
      toast.error('Välj en bild att ladda upp');
      return;
    }

    setUploading(true);

    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      // Get signed URL (private bucket)
      const { data: urlData } = await supabase.storage
        .from('progress-photos')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year expiry

      if (!urlData?.signedUrl) throw new Error('Failed to get signed URL');

      // Save to database
      const { error: dbError } = await supabase
        .from('progress_photos')
        .insert({
          user_id: user.id,
          photo_url: fileName, // Store path, not URL
          photo_date: photoDate,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          notes: notes || null,
          category
        });

      if (dbError) throw dbError;

      toast.success('Bild uppladdad! 📸');
      setShowAddDialog(false);
      resetForm();
      fetchPhotos();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Kunde inte ladda upp bilden');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: ProgressPhoto) => {
    if (!confirm('Vill du verkligen radera denna bild?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('progress-photos')
        .remove([photo.photo_url]);

      if (storageError) console.error('Storage delete error:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('progress_photos')
        .delete()
        .eq('id', photo.id);

      if (dbError) throw dbError;

      toast.success('Bild raderad');
      fetchPhotos();
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Kunde inte radera bilden');
    }
  };

  const resetForm = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoDate(format(new Date(), 'yyyy-MM-dd'));
    setWeightKg('');
    setNotes('');
    setCategory('general');
  };

  const getSignedUrl = async (path: string): Promise<string> => {
    const { data } = await supabase.storage
      .from('progress-photos')
      .createSignedUrl(path, 60 * 60); // 1 hour
    return data?.signedUrl || '';
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'front': return 'Framifrån';
      case 'back': return 'Bakifrån';
      case 'side': return 'Sida';
      default: return 'Allmän';
    }
  };

  const toggleComparePhoto = (photo: ProgressPhoto) => {
    if (comparePhotos[0]?.id === photo.id) {
      setComparePhotos([null, comparePhotos[1]]);
    } else if (comparePhotos[1]?.id === photo.id) {
      setComparePhotos([comparePhotos[0], null]);
    } else if (!comparePhotos[0]) {
      setComparePhotos([photo, comparePhotos[1]]);
    } else if (!comparePhotos[1]) {
      setComparePhotos([comparePhotos[0], photo]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Progressbilder</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {photos.length >= 2 && (
                <Button
                  variant={compareMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCompareMode(!compareMode);
                    setComparePhotos([null, null]);
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Jämför
                </Button>
              )}
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Lägg till
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Ladda upp progressbild</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* Photo upload */}
                    <div>
                      <Label>Bild</Label>
                      <div className="mt-2">
                        {photoPreview ? (
                          <div className="relative">
                            <img 
                              src={photoPreview} 
                              alt="Preview" 
                              className="w-full h-48 object-cover rounded-lg"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={() => {
                                setPhotoFile(null);
                                setPhotoPreview(null);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                            <Camera className="w-10 h-10 text-muted-foreground mb-2" />
                            <span className="text-sm text-muted-foreground">Klicka för att välja bild</span>
                            <input 
                              type="file" 
                              accept="image/*"
                              capture="environment"
                              className="hidden" 
                              onChange={handleFileChange}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <Label>Datum</Label>
                      <Input
                        type="date"
                        value={photoDate}
                        onChange={(e) => setPhotoDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <Label>Kategori</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">Allmän</SelectItem>
                          <SelectItem value="front">Framifrån</SelectItem>
                          <SelectItem value="back">Bakifrån</SelectItem>
                          <SelectItem value="side">Sida</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Weight */}
                    <div>
                      <Label>Vikt (valfritt)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="kg"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <Label>Anteckningar (valfritt)</Label>
                      <Textarea
                        placeholder="T.ex. bulkfas vecka 4..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1"
                        rows={2}
                      />
                    </div>

                    <Button 
                      onClick={handleUpload} 
                      disabled={!photoFile || uploading}
                      className="w-full"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Laddar upp...
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4 mr-2" />
                          Ladda upp
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-2">Inga progressbilder ännu</p>
              <p className="text-xs text-muted-foreground">
                Ladda upp bilder för att följa din fysiska utveckling över tid
              </p>
            </div>
          ) : compareMode && comparePhotos[0] && comparePhotos[1] ? (
            <CompareView 
              photos={comparePhotos as [ProgressPhoto, ProgressPhoto]} 
              getSignedUrl={getSignedUrl}
              getCategoryLabel={getCategoryLabel}
              onClose={() => {
                setCompareMode(false);
                setComparePhotos([null, null]);
              }}
            />
          ) : (
            <div className="space-y-4">
              {compareMode && (
                <p className="text-sm text-muted-foreground text-center">
                  Välj två bilder att jämföra ({comparePhotos.filter(p => p).length}/2)
                </p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <PhotoThumbnail
                    key={photo.id}
                    photo={photo}
                    getSignedUrl={getSignedUrl}
                    onClick={() => {
                      if (compareMode) {
                        toggleComparePhoto(photo);
                      } else {
                        setSelectedPhoto(photo);
                      }
                    }}
                    isSelected={compareMode && (comparePhotos[0]?.id === photo.id || comparePhotos[1]?.id === photo.id)}
                    compareMode={compareMode}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo detail dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-lg">
          {selectedPhoto && (
            <PhotoDetail 
              photo={selectedPhoto} 
              getSignedUrl={getSignedUrl}
              getCategoryLabel={getCategoryLabel}
              onDelete={() => handleDelete(selectedPhoto)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Thumbnail component
function PhotoThumbnail({ 
  photo, 
  getSignedUrl, 
  onClick,
  isSelected,
  compareMode
}: { 
  photo: ProgressPhoto; 
  getSignedUrl: (path: string) => Promise<string>;
  onClick: () => void;
  isSelected?: boolean;
  compareMode?: boolean;
}) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    getSignedUrl(photo.photo_url).then(setUrl);
  }, [photo.photo_url, getSignedUrl]);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative aspect-square rounded-lg overflow-hidden bg-muted group ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
    >
      {url ? (
        <img 
          src={url} 
          alt="Progress" 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-1 left-1 right-1 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] text-white font-medium">
          {format(new Date(photo.photo_date), 'd MMM yy', { locale: sv })}
        </span>
        {photo.weight_kg && (
          <Badge variant="secondary" className="text-[9px] px-1 py-0">
            {photo.weight_kg} kg
          </Badge>
        )}
      </div>
      {compareMode && isSelected && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
          <span className="text-xs text-primary-foreground font-bold">✓</span>
        </div>
      )}
    </motion.button>
  );
}

// Photo detail component
function PhotoDetail({ 
  photo, 
  getSignedUrl,
  getCategoryLabel,
  onDelete 
}: { 
  photo: ProgressPhoto; 
  getSignedUrl: (path: string) => Promise<string>;
  getCategoryLabel: (cat: string) => string;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    getSignedUrl(photo.photo_url).then(setUrl);
  }, [photo.photo_url, getSignedUrl]);

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {format(new Date(photo.photo_date), 'd MMMM yyyy', { locale: sv })}
        </DialogTitle>
      </DialogHeader>
      
      {url ? (
        <img src={url} alt="Progress" className="w-full rounded-lg" />
      ) : (
        <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline">{getCategoryLabel(photo.category)}</Badge>
        {photo.weight_kg && (
          <Badge variant="secondary">
            <Scale className="w-3 h-3 mr-1" />
            {photo.weight_kg} kg
          </Badge>
        )}
      </div>

      {photo.notes && (
        <p className="text-sm text-muted-foreground">{photo.notes}</p>
      )}

      <Button variant="destructive" size="sm" onClick={onDelete} className="w-full">
        <Trash2 className="w-4 h-4 mr-2" />
        Radera bild
      </Button>
    </div>
  );
}

// Compare view component
function CompareView({ 
  photos, 
  getSignedUrl,
  getCategoryLabel,
  onClose 
}: { 
  photos: [ProgressPhoto, ProgressPhoto]; 
  getSignedUrl: (path: string) => Promise<string>;
  getCategoryLabel: (cat: string) => string;
  onClose: () => void;
}) {
  const [urls, setUrls] = useState<[string, string]>(['', '']);

  useEffect(() => {
    Promise.all([
      getSignedUrl(photos[0].photo_url),
      getSignedUrl(photos[1].photo_url)
    ]).then(([url1, url2]) => setUrls([url1, url2]));
  }, [photos, getSignedUrl]);

  const daysDiff = Math.abs(
    (new Date(photos[1].photo_date).getTime() - new Date(photos[0].photo_date).getTime()) / (1000 * 60 * 60 * 24)
  );

  const weightDiff = photos[0].weight_kg && photos[1].weight_kg 
    ? photos[1].weight_kg - photos[0].weight_kg 
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">
          {Math.round(daysDiff)} dagar mellan bilderna
        </Badge>
        {weightDiff !== null && (
          <Badge variant={weightDiff > 0 ? 'default' : 'secondary'}>
            {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} kg
          </Badge>
        )}
        <Button variant="ghost" size="sm" onClick={onClose}>
          Stäng
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {photos.map((photo, idx) => (
          <div key={photo.id} className="space-y-2">
            <p className="text-xs font-medium text-center">
              {idx === 0 ? 'Före' : 'Efter'}
            </p>
            {urls[idx] ? (
              <img 
                src={urls[idx]} 
                alt={idx === 0 ? 'Före' : 'Efter'} 
                className="w-full aspect-[3/4] object-cover rounded-lg"
              />
            ) : (
              <div className="w-full aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                {format(new Date(photo.photo_date), 'd MMM yyyy', { locale: sv })}
              </p>
              {photo.weight_kg && (
                <p className="text-sm font-medium">{photo.weight_kg} kg</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
