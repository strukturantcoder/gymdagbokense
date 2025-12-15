import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, Eye, Image, BarChart3, MousePointerClick, TrendingUp, Code } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Ad {
  id: string;
  name: string;
  image_url: string;
  link: string;
  alt_text: string | null;
  format: string;
  placement: string | null;
  is_active: boolean;
  created_at: string;
}

interface AdStats {
  id: string;
  name: string;
  format: string;
  placement: string | null;
  is_active: boolean;
  impressions: number;
  clicks: number;
  ctr: number;
}

const AD_FORMATS = [
  { value: "horizontal", label: "Horisontell banner (468x60)", dimensions: "468x60" },
  { value: "square_large", label: "Stor kvadrat (1200x1200)", dimensions: "1200x1200" },
  { value: "square_medium", label: "Medium kvadrat (500x500)", dimensions: "500x500" },
  { value: "vertical", label: "Vertikal skyscraper (160x600)", dimensions: "160x600" },
  { value: "leaderboard", label: "Leaderboard (728x90)", dimensions: "728x90" },
  { value: "mobile_banner", label: "Mobilbanner (320x50)", dimensions: "320x50" },
];

const AD_PLACEMENTS = [
  { value: "dashboard_top", label: "Dashboard - Toppen" },
  { value: "dashboard_bottom", label: "Dashboard - Botten" },
  { value: "training_top", label: "Träning - Toppen" },
  { value: "training_bottom", label: "Träning - Botten" },
  { value: "statistics_top", label: "Statistik - Toppen" },
  { value: "statistics_bottom", label: "Statistik - Botten" },
  { value: "social_top", label: "Socialt - Toppen" },
  { value: "social_bottom", label: "Socialt - Botten" },
  { value: "sidebar", label: "Sidopanel" },
  { value: "any", label: "Valfri position" },
];

const AdminAds = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [ads, setAds] = useState<Ad[]>([]);
  const [adStats, setAdStats] = useState<AdStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewAd, setPreviewAd] = useState<Ad | null>(null);
  const [activeTab, setActiveTab] = useState("ads");
  
  const [formData, setFormData] = useState({
    name: "",
    image_url: "",
    link: "",
    alt_text: "",
    format: "horizontal",
    placement: "any",
    is_active: true,
  });
  const [embedCode, setEmbedCode] = useState("");

  const parseTradeDoublerCode = (code: string) => {
    try {
      // Extract link from <a href="...">
      const linkMatch = code.match(/<a[^>]+href=["']([^"']+)["']/i);
      const link = linkMatch ? linkMatch[1] : "";

      // Extract image URL from <img src="...">
      const imgMatch = code.match(/<img[^>]+src=["']([^"']+)["']/i);
      const imageUrl = imgMatch ? imgMatch[1] : "";

      // Extract dimensions from width and height attributes
      const widthMatch = code.match(/width=["']?(\d+)["']?/i);
      const heightMatch = code.match(/height=["']?(\d+)["']?/i);
      const width = widthMatch ? parseInt(widthMatch[1]) : 0;
      const height = heightMatch ? parseInt(heightMatch[1]) : 0;

      // Extract alt text from <img alt="...">
      const altMatch = code.match(/<img[^>]+alt=["']([^"']*)["']/i);
      const altText = altMatch ? altMatch[1] : "";

      // Determine format based on dimensions
      let format = "horizontal";
      if (width && height) {
        if (width === 1200 && height === 1200) format = "square_large";
        else if (width === 500 && height === 500) format = "square_medium";
        else if (width === 160 && height === 600) format = "vertical";
        else if (width === 728 && height === 90) format = "leaderboard";
        else if (width === 320 && height === 50) format = "mobile_banner";
        else if (width === 468 && height === 60) format = "horizontal";
        else if (height > width * 2) format = "vertical";
        else if (width === height) format = width > 600 ? "square_large" : "square_medium";
      }

      if (link || imageUrl) {
        setFormData(prev => ({
          ...prev,
          image_url: imageUrl || prev.image_url,
          link: link || prev.link,
          alt_text: altText || prev.alt_text,
          format: format,
          name: prev.name || `Tradedoubler ${width}x${height}`,
        }));
        toast.success("Tradedoubler-kod tolkad!");
        setEmbedCode("");
      } else {
        toast.error("Kunde inte hitta länk eller bild i koden");
      }
    } catch (err) {
      console.error("Error parsing embed code:", err);
      toast.error("Kunde inte tolka koden");
    }
  };

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        navigate("/dashboard");
      } else {
        fetchAds();
        fetchAdStats();
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, navigate]);

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (err) {
      console.error("Error fetching ads:", err);
      toast.error("Kunde inte hämta annonser");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdStats = async () => {
    try {
      const { data, error } = await supabase
        .from("ad_statistics")
        .select("*")
        .order("impressions", { ascending: false });

      if (error) throw error;
      setAdStats((data || []) as AdStats[]);
    } catch (err) {
      console.error("Error fetching ad stats:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      image_url: "",
      link: "",
      alt_text: "",
      format: "horizontal",
      placement: "any",
      is_active: true,
    });
    setEditingAd(null);
  };

  const openEditDialog = (ad: Ad) => {
    setEditingAd(ad);
    setFormData({
      name: ad.name,
      image_url: ad.image_url,
      link: ad.link,
      alt_text: ad.alt_text || "",
      format: ad.format,
      placement: ad.placement || "any",
      is_active: ad.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.image_url || !formData.link) {
      toast.error("Fyll i alla obligatoriska fält");
      return;
    }

    try {
      if (editingAd) {
        const { error } = await supabase
          .from("ads")
          .update({
            name: formData.name,
            image_url: formData.image_url,
            link: formData.link,
            alt_text: formData.alt_text || null,
            format: formData.format,
            placement: formData.placement === "any" ? null : formData.placement,
            is_active: formData.is_active,
          })
          .eq("id", editingAd.id);

        if (error) throw error;
        toast.success("Annons uppdaterad");
      } else {
        const { error } = await supabase
          .from("ads")
          .insert({
            name: formData.name,
            image_url: formData.image_url,
            link: formData.link,
            alt_text: formData.alt_text || null,
            format: formData.format,
            placement: formData.placement === "any" ? null : formData.placement,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success("Annons skapad");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchAds();
      fetchAdStats();
    } catch (err) {
      console.error("Error saving ad:", err);
      toast.error("Kunde inte spara annons");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna annons?")) return;

    try {
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) throw error;
      toast.success("Annons borttagen");
      fetchAds();
      fetchAdStats();
    } catch (err) {
      console.error("Error deleting ad:", err);
      toast.error("Kunde inte ta bort annons");
    }
  };

  const toggleActive = async (ad: Ad) => {
    try {
      const { error } = await supabase
        .from("ads")
        .update({ is_active: !ad.is_active })
        .eq("id", ad.id);

      if (error) throw error;
      toast.success(ad.is_active ? "Annons inaktiverad" : "Annons aktiverad");
      fetchAds();
    } catch (err) {
      console.error("Error toggling ad:", err);
      toast.error("Kunde inte uppdatera annons");
    }
  };

  const getFormatLabel = (format: string) => AD_FORMATS.find(f => f.value === format)?.label || format;
  const getPlacementLabel = (placement: string | null) => {
    if (!placement) return "Valfri";
    return AD_PLACEMENTS.find(p => p.value === placement)?.label || placement;
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalImpressions = adStats.reduce((sum, ad) => sum + ad.impressions, 0);
  const totalClicks = adStats.reduce((sum, ad) => sum + ad.clicks, 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Annonshantering</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-xs">
            <TabsTrigger value="ads" className="gap-2">
              <Image className="h-4 w-4" />
              Annonser
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistik
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ads" className="mt-6 space-y-6">
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Annonser ({ads.length})</CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Ny annons
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{editingAd ? "Redigera annons" : "Skapa ny annons"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2 p-3 border border-dashed border-primary/50 rounded-lg bg-primary/5">
                        <Label htmlFor="embed_code" className="flex items-center gap-2 text-primary">
                          <Code className="w-4 h-4" />
                          Klistra in Tradedoubler-kod
                        </Label>
                        <Textarea
                          id="embed_code"
                          value={embedCode}
                          onChange={(e) => setEmbedCode(e.target.value)}
                          placeholder='<a href="https://..."><img src="https://..." width="468" height="60" /></a>'
                          rows={3}
                          className="text-xs font-mono"
                        />
                        <Button 
                          type="button" 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => parseTradeDoublerCode(embedCode)}
                          disabled={!embedCode.trim()}
                          className="w-full"
                        >
                          Tolka kod automatiskt
                        </Button>
                      </div>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">eller fyll i manuellt</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name">Namn *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="T.ex. Tradedoubler Sommarkampanj"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="image_url">Bild-URL *</Label>
                        <Input
                          id="image_url"
                          value={formData.image_url}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="link">Länk *</Label>
                        <Input
                          id="link"
                          value={formData.link}
                          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="alt_text">Alt-text</Label>
                        <Input
                          id="alt_text"
                          value={formData.alt_text}
                          onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
                          placeholder="Beskrivning av annonsen"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Format *</Label>
                        <Select value={formData.format} onValueChange={(value) => setFormData({ ...formData, format: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {AD_FORMATS.map((format) => (
                              <SelectItem key={format.value} value={format.value}>{format.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Placering</Label>
                        <Select value={formData.placement} onValueChange={(value) => setFormData({ ...formData, placement: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {AD_PLACEMENTS.map((placement) => (
                              <SelectItem key={placement.value} value={placement.value}>{placement.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="is_active">Aktiv</Label>
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                      </div>
                      {formData.image_url && (
                        <div className="space-y-2">
                          <Label>Förhandsvisning</Label>
                          <div className="border border-border rounded-lg p-2 bg-muted/20">
                            <img 
                              src={formData.image_url} 
                              alt="Förhandsvisning" 
                              className="max-w-full h-auto max-h-40 object-contain mx-auto"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">Avbryt</Button></DialogClose>
                      <Button onClick={handleSubmit}>{editingAd ? "Spara" : "Skapa"}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {ads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Image className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Inga annonser ännu</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Namn</TableHead>
                          <TableHead>Format</TableHead>
                          <TableHead>Placering</TableHead>
                          <TableHead>Aktiv</TableHead>
                          <TableHead className="text-right">Åtgärder</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ads.map((ad) => (
                          <TableRow key={ad.id}>
                            <TableCell className="font-medium">{ad.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{getFormatLabel(ad.format)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{getPlacementLabel(ad.placement)}</TableCell>
                            <TableCell><Switch checked={ad.is_active} onCheckedChange={() => toggleActive(ad)} /></TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setPreviewAd(ad)}><Eye className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(ad)}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(ad.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardHeader><CardTitle className="text-lg">Formatguide</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {AD_FORMATS.map((format) => (
                    <div key={format.value} className="p-3 border border-border/50 rounded-lg">
                      <div className="font-medium text-sm">{format.label}</div>
                      <div className="text-xs text-muted-foreground">{format.dimensions} px</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="mt-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-border/50 bg-card/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10"><Eye className="w-5 h-5 text-blue-500" /></div>
                    <div>
                      <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Totala visningar</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10"><MousePointerClick className="w-5 h-5 text-green-500" /></div>
                    <div>
                      <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Totala klick</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50 bg-card/50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="w-5 h-5 text-primary" /></div>
                    <div>
                      <div className="text-2xl font-bold">{avgCtr}%</div>
                      <div className="text-xs text-muted-foreground">Genomsnittlig CTR</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/50 bg-card/50">
              <CardHeader><CardTitle className="text-lg">Prestanda per annons</CardTitle></CardHeader>
              <CardContent>
                {adStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Ingen statistik ännu</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Annons</TableHead>
                          <TableHead>Format</TableHead>
                          <TableHead className="text-right">Visningar</TableHead>
                          <TableHead className="text-right">Klick</TableHead>
                          <TableHead className="text-right">CTR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adStats.map((stat) => (
                          <TableRow key={stat.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${stat.is_active ? 'bg-green-500' : 'bg-muted'}`} />
                                {stat.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{getFormatLabel(stat.format)}</TableCell>
                            <TableCell className="text-right font-mono">{stat.impressions.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono">{stat.clicks.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono">
                              <span className={stat.ctr > 1 ? 'text-green-500' : stat.ctr > 0.5 ? 'text-yellow-500' : 'text-muted-foreground'}>
                                {stat.ctr.toFixed(2)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!previewAd} onOpenChange={() => setPreviewAd(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{previewAd?.name}</DialogTitle></DialogHeader>
            {previewAd && (
              <div className="space-y-4">
                <div className="border border-border rounded-lg p-4 bg-muted/20">
                  <img src={previewAd.image_url} alt={previewAd.alt_text || "Annons"} className="max-w-full h-auto mx-auto" />
                </div>
                <div className="grid gap-2 text-sm">
                  <div><span className="text-muted-foreground">Format:</span> {getFormatLabel(previewAd.format)}</div>
                  <div><span className="text-muted-foreground">Placering:</span> {getPlacementLabel(previewAd.placement)}</div>
                  <div><span className="text-muted-foreground">Länk:</span> <a href={previewAd.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{previewAd.link}</a></div>
                  <div><span className="text-muted-foreground">Status:</span> {previewAd.is_active ? "Aktiv" : "Inaktiv"}</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminAds;