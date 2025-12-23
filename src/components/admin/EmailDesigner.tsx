import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Eye, Send, Users, User, Loader2, Calendar, Clock, Link, Plus, Trash2, LinkIcon, Check, X, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmailPreview } from "./EmailPreview";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/useDebounce";

interface AffiliateLink {
  id: string;
  label: string;
  url: string;
  imageUrl?: string;
}

interface DetectedLink {
  text: string;
  startIndex: number;
  endIndex: number;
  suggestedUrl?: string;
}

interface EmailDesignerProps {
  initialDraft?: { subject: string; content: string; template: string } | null;
  onDraftLoaded?: () => void;
}

const emailTemplates = [
  { id: "custom", name: "Egen mall" },
  { id: "weekly_summary", name: "Veckosammanfattning" },
  { id: "motivation", name: "Motivationsmejl" },
  { id: "feature_update", name: "Ny funktion" },
  { id: "reminder", name: "Påminnelse" },
];

export const EmailDesigner = ({ initialDraft, onDraftLoaded }: EmailDesignerProps) => {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [template, setTemplate] = useState("custom");
  const [testEmail, setTestEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("16:00");
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [savedAffiliateLinks, setSavedAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [detectedLinks, setDetectedLinks] = useState<DetectedLink[]>([]);
  const [linkUrls, setLinkUrls] = useState<Record<string, string>>({});
  const [appliedLinkKeys, setAppliedLinkKeys] = useState<Record<string, boolean>>({});
  const [isDetectingLinks, setIsDetectingLinks] = useState(false);
  
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  
  const debouncedContent = useDebounce(content, 1000);

  // Load initial draft if provided
  useEffect(() => {
    if (initialDraft) {
      setSubject(initialDraft.subject);
      setContent(initialDraft.content);
      setTemplate(initialDraft.template);
      onDraftLoaded?.();
    }
  }, [initialDraft, onDraftLoaded]);

  // Load saved affiliate links from ads table
  useEffect(() => {
    const loadAffiliateLinks = async () => {
      const { data } = await supabase
        .from("ads")
        .select("id, name, link, image_url")
        .eq("is_active", true)
        .order("name");
      
      if (data) {
        setSavedAffiliateLinks(data.map(ad => ({
          id: ad.id,
          label: ad.name,
          url: ad.link,
          imageUrl: ad.image_url
        })));
      }
    };
    loadAffiliateLinks();
  }, []);

  // Detect potential links in content using AI
  const detectLinksInContent = useCallback(async (text: string) => {
    if (!text || text.length < 20) {
      setDetectedLinks([]);
      return;
    }

    setIsDetectingLinks(true);
    try {
      // Send saved affiliate links to AI for matching suggestions
      const { data, error } = await supabase.functions.invoke("generate-email-content", {
        body: { 
          detectLinks: true,
          content: text,
          availableAffiliates: savedAffiliateLinks.map(l => ({
            name: l.label,
            url: l.url
          }))
        },
      });

      if (error) throw error;

      if (data.links && Array.isArray(data.links)) {
        // Auto-fill suggested URLs from matched affiliates
        const linksWithUrls: Record<string, string> = {};
        data.links.forEach((link: DetectedLink) => {
          if (link.suggestedUrl) {
            linksWithUrls[`${link.startIndex}-${link.endIndex}`] = link.suggestedUrl;
          }
        });
        setLinkUrls(prev => ({ ...prev, ...linksWithUrls }));
        setDetectedLinks(data.links);
      } else {
        setDetectedLinks([]);
      }
    } catch (error) {
      console.error("Error detecting links:", error);
    } finally {
      setIsDetectingLinks(false);
    }
  }, [savedAffiliateLinks]);

  // Auto-detect links when content changes
  useEffect(() => {
    if (debouncedContent) {
      detectLinksInContent(debouncedContent);
    }
  }, [debouncedContent, detectLinksInContent]);

  const applyLinkToContent = (link: DetectedLink, url: string) => {
    if (!url) {
      toast.error("Ange en URL först");
      return;
    }

    const key = `${link.startIndex}-${link.endIndex}`;

    // Find the actual position of the text in content (prefer near suggested startIndex)
    const textToFind = link.text;
    const preferredFrom = Math.max(0, (link.startIndex ?? 0) - 10);
    let actualIndex = content.indexOf(textToFind, preferredFrom);
    if (actualIndex === -1) {
      actualIndex = content.indexOf(textToFind);
    }

    if (actualIndex === -1) {
      toast.error(`Kunde inte hitta "${textToFind}" i texten`);
      return;
    }

    // Replace the occurrence with a markdown link (renders as a hyperlink in preview + sent email)
    const before = content.substring(0, actualIndex);
    const after = content.substring(actualIndex + textToFind.length);
    const newContent = `${before}[${textToFind}](${url})${after}`;
    setContent(newContent);

    // Mark as applied (keep it in the list as "klar")
    setAppliedLinkKeys((prev) => ({ ...prev, [key]: true }));

    toast.success("Länk tillagd");
  };

  const dismissLink = (link: DetectedLink) => {
    const key = `${link.startIndex}-${link.endIndex}`;
    setDetectedLinks(detectedLinks.filter((l) => `${l.startIndex}-${l.endIndex}` !== key));
    setAppliedLinkKeys((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setLinkUrls((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addAffiliateLink = () => {
    setAffiliateLinks([...affiliateLinks, { id: crypto.randomUUID(), label: "", url: "" }]);
  };

  const updateAffiliateLink = (id: string, field: keyof AffiliateLink, value: string) => {
    setAffiliateLinks(affiliateLinks.map(link => 
      link.id === id ? { ...link, [field]: value } : link
    ));
  };

  const removeAffiliateLink = (id: string) => {
    setAffiliateLinks(affiliateLinks.filter(link => link.id !== id));
  };

  const addSavedAffiliateLink = (savedLink: AffiliateLink) => {
    if (!affiliateLinks.find(l => l.id === savedLink.id)) {
      setAffiliateLinks([...affiliateLinks, savedLink]);
    }
  };

  const generateWithAI = async () => {
    if (!template || template === "custom") {
      toast.error("Välj en mall för att få AI-förslag");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-email-content", {
        body: { template, currentSubject: subject, currentContent: content },
      });

      if (error) throw error;

      if (data.subject) setSubject(data.subject);
      if (data.content) setContent(data.content);
      toast.success("AI genererade förslag!");
    } catch (error) {
      console.error("Error generating email:", error);
      toast.error("Kunde inte generera mejlförslag");
    } finally {
      setIsGenerating(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Ange en testmejladress");
      return;
    }
    if (!subject || !content) {
      toast.error("Fyll i ämne och innehåll");
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-custom-email", {
        body: { 
          to: testEmail, 
          subject, 
          content,
          affiliateLinks: affiliateLinks.filter(l => l.label && l.url),
          isTest: true 
        },
      });

      if (error) throw error;
      toast.success(`Testmejl skickat till ${testEmail}`);
    } catch (error) {
      console.error("Error sending test email:", error);
      toast.error("Kunde inte skicka testmejl");
    } finally {
      setIsSending(false);
    }
  };

  const sendToAllUsers = async () => {
    if (!subject || !content) {
      toast.error("Fyll i ämne och innehåll");
      return;
    }

    const confirmed = window.confirm(
      "Är du säker på att du vill skicka detta mejl till ALLA användare? Detta går inte att ångra."
    );

    if (!confirmed) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-custom-email", {
        body: { 
          subject, 
          content,
          affiliateLinks: affiliateLinks.filter(l => l.label && l.url),
          sendToAll: true 
        },
      });

      if (error) throw error;
      toast.success(`Mejl skickat till ${data?.sentCount || 'alla'} användare`);
    } catch (error) {
      console.error("Error sending emails:", error);
      toast.error("Kunde inte skicka mejl");
    } finally {
      setIsSending(false);
    }
  };

  const scheduleEmail = async () => {
    if (!subject || !content) {
      toast.error("Fyll i ämne och innehåll");
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      toast.error("Välj datum och tid");
      return;
    }

    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (scheduledFor <= new Date()) {
      toast.error("Välj ett datum i framtiden");
      return;
    }

    setIsScheduling(true);
    try {
      const { error } = await supabase.from("scheduled_emails").insert({
        subject,
        content,
        template,
        scheduled_for: scheduledFor.toISOString(),
      });

      if (error) throw error;
      toast.success(`Mejl schemalagt för ${format(scheduledFor, "d MMM HH:mm")}`);
      setScheduleDate("");
      setScheduleTime("16:00");
    } catch (error) {
      console.error("Error scheduling email:", error);
      toast.error("Kunde inte schemalägga mejl");
    } finally {
      setIsScheduling(false);
    }
  };

  const saveDraft = async () => {
    if (!subject && !content) {
      toast.error("Fyll i ämne eller innehåll för att spara utkast");
      return;
    }

    setIsSavingDraft(true);
    try {
      const { error } = await supabase.from("email_drafts").insert({
        subject,
        content,
        template,
      });

      if (error) throw error;
      toast.success("Utkast sparat");
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Kunde inte spara utkast");
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Designa mejl
          </CardTitle>
          <CardDescription>
            Skapa och anpassa mejl med AI-hjälp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mall</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Välj mall" />
              </SelectTrigger>
              <SelectContent>
                {emailTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Ämne</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ange ämnesrad..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Innehåll</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Skriv ditt mejlinnehåll här... (stödjer markdown)"
              className="min-h-[200px]"
            />
          </div>

          {/* Detected Links Section */}
          {(detectedLinks.length > 0 || isDetectingLinks) && (
            <div className="border rounded-lg p-4 space-y-3 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <Label className="text-blue-700 dark:text-blue-300">
                  {isDetectingLinks ? "Letar efter potentiella länkar..." : "Potentiella länkar hittade"}
                </Label>
                {isDetectingLinks && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
              </div>

              {detectedLinks.map((link) => {
                const key = `${link.startIndex}-${link.endIndex}`;
                const isApplied = Boolean(appliedLinkKeys[key]);

                return (
                  <div
                    key={key}
                    className={
                      "rounded-lg p-3 space-y-2 border " +
                      (isApplied
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                        : "bg-white dark:bg-background border-blue-100 dark:border-blue-800")
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">"{link.text}"</span>
                        {isApplied && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            <Check className="h-3 w-3" />
                            Klar
                          </span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => dismissLink(link)}
                        className="h-6 w-6"
                        aria-label="Dölj förslag"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {!isApplied && (
                      <>
                        <div className="flex gap-2">
                          <Input
                            value={linkUrls[key] || ""}
                            onChange={(e) =>
                              setLinkUrls((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            placeholder="Ange länk-URL..."
                            className="h-8 text-sm flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => applyLinkToContent(link, linkUrls[key] || "")}
                            disabled={!linkUrls[key]}
                            className="h-8"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Lägg till
                          </Button>
                        </div>

                        {savedAffiliateLinks.length > 0 && (
                          <Select
                            onValueChange={(id) => {
                              const savedLink = savedAffiliateLinks.find((l) => l.id === id);
                              if (savedLink) {
                                setLinkUrls((prev) => ({ ...prev, [key]: savedLink.url }));
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Eller välj från sparade annonser..." />
                            </SelectTrigger>
                            <SelectContent>
                              {savedAffiliateLinks.map((savedLink) => (
                                <SelectItem key={savedLink.id} value={savedLink.id}>
                                  {savedLink.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Affiliate Links Section */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Affiliatelänkar
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAffiliateLink}
              >
                <Plus className="h-4 w-4 mr-1" />
                Lägg till
              </Button>
            </div>

            {savedAffiliateLinks.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Välj från sparade annonser:</Label>
                <Select onValueChange={(id) => {
                  const link = savedAffiliateLinks.find(l => l.id === id);
                  if (link) addSavedAffiliateLink(link);
                }}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Välj annons..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedAffiliateLinks.map(link => (
                      <SelectItem key={link.id} value={link.id}>
                        {link.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {affiliateLinks.map((link) => (
              <div key={link.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Knapptext</Label>
                  <Input
                    value={link.label}
                    onChange={(e) => updateAffiliateLink(link.id, "label", e.target.value)}
                    placeholder="T.ex. Köp nu"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={link.url}
                    onChange={(e) => updateAffiliateLink(link.id, "url", e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAffiliateLink(link.id)}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            {affiliateLinks.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Inga affiliatelänkar tillagda
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={generateWithAI}
              disabled={isGenerating || template === "custom"}
              variant="outline"
              className="flex-1"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              AI-förslag
            </Button>
            <Button
              onClick={saveDraft}
              disabled={isSavingDraft || (!subject && !content)}
              variant="outline"
              className="flex-1"
            >
              {isSavingDraft ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Spara utkast
            </Button>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Testmejladress</Label>
              <div className="flex gap-2">
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="din@mejl.se"
                />
                <Button
                  onClick={sendTestEmail}
                  disabled={isSending || !testEmail}
                  variant="secondary"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Scheduling section */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schemalägg utskick
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
              <Button
                onClick={scheduleEmail}
                disabled={isScheduling || !subject || !content || !scheduleDate}
                variant="outline"
                className="w-full"
              >
                {isScheduling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4 mr-2" />
                )}
                Schemalägg
              </Button>
            </div>

            <Button
              onClick={sendToAllUsers}
              disabled={isSending || !subject || !content}
              className="w-full"
              variant="destructive"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Skicka till alla NU
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Förhandsgranskning
          </CardTitle>
          <CardDescription>
            Se hur mejlet kommer att se ut
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailPreview 
            subject={subject} 
            content={content} 
            affiliateLinks={affiliateLinks.filter(l => l.label && l.url)}
          />
        </CardContent>
      </Card>
    </div>
  );
};
