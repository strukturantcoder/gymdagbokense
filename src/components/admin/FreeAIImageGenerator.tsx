import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Download, Sparkles, Loader2, RefreshCw, Share2, Wand2, ImageIcon, Trash2, Clock, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SavedImage {
  id: string;
  image_url: string;
  prompt: string;
  format: string;
  created_at: string;
}

export default function FreeAIImageGenerator() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageFormat, setImageFormat] = useState<"square" | "portrait" | "landscape">("square");
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [includeBranding, setIncludeBranding] = useState(true);

  // Load saved images on mount
  useEffect(() => {
    if (user) {
      loadSavedImages();
    }
  }, [user]);

  const loadSavedImages = async () => {
    try {
      const { data, error } = await supabase
        .from("saved_marketing_images")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedImages(data || []);
    } catch (error) {
      console.error("Error loading saved images:", error);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const saveImage = async (imageUrl: string, imagePrompt: string, format: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("saved_marketing_images")
        .insert({
          user_id: user.id,
          image_url: imageUrl,
          prompt: imagePrompt,
          format: format,
        });

      if (error) throw error;
      
      // Reload saved images
      await loadSavedImages();
      toast.success("Bilden har sparats!");
    } catch (error) {
      console.error("Error saving image:", error);
      toast.error("Kunde inte spara bilden");
    }
  };

  const deleteImage = async (id: string) => {
    try {
      const { error } = await supabase
        .from("saved_marketing_images")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setSavedImages(prev => prev.filter(img => img.id !== id));
      toast.success("Bilden har raderats!");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Kunde inte radera bilden");
    }
  };

  const getFormatDescription = () => {
    switch (imageFormat) {
      case "square":
        return "1:1 - Perfekt för Instagram-inlägg";
      case "portrait":
        return "9:16 - Perfekt för Instagram Stories";
      case "landscape":
        return "16:9 - Perfekt för banners";
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error("Skriv en beskrivning av bilden du vill skapa");
      return;
    }

    setIsGenerating(true);
    try {
      // Build an enhanced prompt with format-specific requirements
      let formatPrompt = "";
      switch (imageFormat) {
        case "square":
          formatPrompt = "Instagram square format (1:1 aspect ratio)";
          break;
        case "portrait":
          formatPrompt = "Instagram Story format (9:16 aspect ratio, vertical)";
          break;
        case "landscape":
          formatPrompt = "Wide banner format (16:9 aspect ratio, horizontal)";
          break;
      }

      const brandingPrompt = includeBranding 
        ? " Include the Gymdagboken logo (a stylized orange/black dumbbell icon) and the text 'Gymdagboken.se' in a subtle but visible way, integrated naturally into the image design."
        : "";

      const fullPrompt = `${prompt}. ${formatPrompt}.${brandingPrompt} Ultra high resolution, professional quality.`;

      const { data, error } = await supabase.functions.invoke("generate-challenge-image", {
        body: {
          prompt: fullPrompt,
          challengeTitle: "Custom Image",
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        // Automatically save the image
        await saveImage(data.imageUrl, prompt, imageFormat);
      } else {
        toast.error("Ingen bild returnerades");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Kunde inte generera bild");
    } finally {
      setIsGenerating(false);
    }
  };

  const editImage = async () => {
    if (!generatedImage) {
      toast.error("Generera en bild först");
      return;
    }
    if (!editPrompt.trim()) {
      toast.error("Beskriv hur du vill ändra bilden");
      return;
    }

    setIsEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-challenge-image", {
        body: {
          prompt: editPrompt,
          editImage: generatedImage,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        // Automatically save the edited image
        await saveImage(data.imageUrl, `${prompt} (redigerad: ${editPrompt})`, imageFormat);
        setEditPrompt("");
        toast.success("Bild redigerad och sparad!");
      } else {
        toast.error("Ingen bild returnerades");
      }
    } catch (error) {
      console.error("Error editing image:", error);
      toast.error("Kunde inte redigera bild");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDownload = async (imageUrl?: string) => {
    const url = imageUrl || generatedImage;
    if (!url) {
      toast.error("Ingen bild att ladda ner");
      return;
    }

    try {
      // Fetch the image and convert to blob
      const response = await fetch(url);
      const blob = await response.blob();
      
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `ai-image-${imageFormat}-${Date.now()}.png`;
      link.click();
      URL.revokeObjectURL(blobUrl);
      toast.success("Bilden har laddats ner!");
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Kunde inte ladda ner bilden");
    }
  };

  const handleShare = async () => {
    if (!generatedImage) {
      toast.error("Ingen bild att dela");
      return;
    }

    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const file = new File([blob], `ai-image-${imageFormat}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "AI-genererad bild",
        });
        toast.success("Delad!");
      } else {
        handleDownload();
        toast.info("Öppna Instagram och välj bilden från kamerarullen");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        handleDownload();
      }
    }
  };

  const loadSavedImage = (image: SavedImage) => {
    setGeneratedImage(image.image_url);
    setPrompt(image.prompt);
    setImageFormat(image.format as typeof imageFormat);
    setShowSaved(false);
    toast.success("Bild laddad!");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("sv-SE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const examplePrompts = [
    "En person som tränar styrketräning i ett modernt gym med dramatisk belysning",
    "Motiverande fitness-bild med vikter och energifull atmosfär",
    "Löpare i soluppgång på en vacker stig med berg i bakgrunden",
    "Hälsosam mat och träningsutrustning i en stilren flat lay komposition",
    "Episk CrossFit-workout med rök och neonljus",
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                AI-bildgenerator
              </CardTitle>
              <CardDescription>
                Skapa bilder med AI baserat på din beskrivning. Bilder sparas automatiskt.
              </CardDescription>
            </div>
            <Button
              variant={showSaved ? "default" : "outline"}
              onClick={() => setShowSaved(!showSaved)}
              className="gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              Sparade bilder ({savedImages.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Saved images gallery */}
          {showSaved && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <Label className="text-lg font-semibold">Sparade bilder</Label>
              {isLoadingSaved ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : savedImages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Inga sparade bilder än. Generera en bild så sparas den automatiskt!
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {savedImages.map((image) => (
                    <div key={image.id} className="group relative">
                      <div 
                        className="aspect-square rounded-lg overflow-hidden border bg-background cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                        onClick={() => loadSavedImage(image)}
                      >
                        <img
                          src={image.image_url}
                          alt={image.prompt}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-between p-2">
                        <p className="text-white text-xs line-clamp-2">{image.prompt}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-white/70 text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(image.created_at)}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-white hover:bg-white/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(image.image_url);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-red-400 hover:bg-red-500/20"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Radera bild?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Är du säker på att du vill radera denna bild? Detta går inte att ångra.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteImage(image.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Radera
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Branding toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="branding-toggle" className="text-base font-medium cursor-pointer">
                Inkludera Gymdagboken-branding
              </Label>
              <p className="text-sm text-muted-foreground">
                Lägg till loggan och "Gymdagboken.se" i bilden
              </p>
            </div>
            <Switch
              id="branding-toggle"
              checked={includeBranding}
              onCheckedChange={setIncludeBranding}
            />
          </div>

          {/* Format selection */}
          <div className="space-y-2">
            <Label>Bildformat</Label>
            <Tabs value={imageFormat} onValueChange={(v) => setImageFormat(v as typeof imageFormat)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="square">Kvadrat (1:1)</TabsTrigger>
                <TabsTrigger value="portrait">Stående (9:16)</TabsTrigger>
                <TabsTrigger value="landscape">Liggande (16:9)</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-sm text-muted-foreground">{getFormatDescription()}</p>
          </div>

          {/* Prompt input */}
          <div className="space-y-2">
            <Label>Beskriv bilden du vill skapa</Label>
            <Textarea
              placeholder="Beskriv bilden i detalj... T.ex. 'En motiverande bild av en person som lyfter vikter i ett modernt gym med orange och svart färgschema'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Example prompts */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Exempel på prompts:</Label>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1 px-2"
                  onClick={() => setPrompt(example)}
                >
                  {example.substring(0, 40)}...
                </Button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={generateImage}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Genererar bild...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generera bild
              </>
            )}
          </Button>

          {/* Generated image preview */}
          {generatedImage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Genererad bild</Label>
                <div className="relative rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={generatedImage}
                    alt="AI-genererad bild"
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                </div>
              </div>

              {/* Edit image section */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <Label>Redigera bilden med AI</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Beskriv ändringen... T.ex. 'Lägg till mer orange färg' eller 'Gör det mörkare'"
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={editImage}
                    disabled={isEditing || !editPrompt.trim()}
                    variant="secondary"
                  >
                    {isEditing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button onClick={() => handleDownload()} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Ladda ner
                </Button>
                <Button onClick={handleShare} className="flex-1">
                  <Share2 className="h-4 w-4 mr-2" />
                  Dela
                </Button>
              </div>

              {/* Generate new button */}
              <Button
                onClick={generateImage}
                variant="ghost"
                disabled={isGenerating}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generera ny bild med samma prompt
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!generatedImage && !isGenerating && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-center">
                Skriv en beskrivning och klicka på "Generera bild" för att skapa din AI-bild
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
