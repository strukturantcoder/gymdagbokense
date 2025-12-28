import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const EmailHelp = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const emailClients = [
    {
      id: "gmail",
      name: "Gmail",
      steps: [
        "Öppna ett mail från noreply@gymdagboken.se (kolla skräpposten om du inte hittar det)",
        "Klicka på de tre prickarna (⋮) uppe till höger i mailet",
        "Välj \"Filtrera meddelanden som dessa\"",
        "Klicka på \"Skapa filter\"",
        "Markera \"Markera aldrig som skräppost\" och \"Kategorisera som: Primär\"",
        "Klicka på \"Skapa filter\""
      ]
    },
    {
      id: "outlook",
      name: "Outlook / Hotmail",
      steps: [
        "Öppna ett mail från noreply@gymdagboken.se (kolla skräpposten)",
        "Klicka på de tre prickarna (⋯) uppe till höger",
        "Välj \"Lägg till i säkra avsändare\" eller \"Markera som inte skräppost\"",
        "Alternativt: Gå till Inställningar → Visa alla Outlook-inställningar → E-post → Skräppost",
        "Under \"Säkra avsändare\" lägg till: gymdagboken.se"
      ]
    },
    {
      id: "apple",
      name: "Apple Mail (iPhone/Mac)",
      steps: [
        "Öppna Mail-appen",
        "Hitta ett mail från noreply@gymdagboken.se",
        "Tryck på avsändarens namn/adress",
        "Välj \"Lägg till i kontakter\"",
        "Spara kontakten - mail från denna adress kommer nu alltid till inkorgen"
      ]
    },
    {
      id: "yahoo",
      name: "Yahoo Mail",
      steps: [
        "Öppna ett mail från noreply@gymdagboken.se",
        "Klicka på de tre prickarna bredvid avsändarens namn",
        "Välj \"Lägg till avsändare i kontakter\"",
        "Alternativt: Gå till Inställningar → Fler inställningar → Filter",
        "Skapa ett filter för mail från gymdagboken.se till inkorgen"
      ]
    },
    {
      id: "android",
      name: "Android / Samsung Mail",
      steps: [
        "Öppna Gmail-appen eller din standard-mailapp",
        "Hitta mailet från noreply@gymdagboken.se i skräpposten",
        "Öppna mailet och tryck \"Rapportera som inte skräppost\"",
        "Alternativt: Lägg till noreply@gymdagboken.se som kontakt"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common.back")}
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              Lägg till Gymdagboken som betrodd avsändare
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              För att säkerställa att du får våra mail i inkorgen istället för skräpposten, 
              följ instruktionerna för din e-postklient nedan.
            </p>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {emailClients.map((client) => (
                <AccordionItem key={client.id} value={client.id}>
                  <AccordionTrigger className="text-left">
                    {client.name}
                  </AccordionTrigger>
                  <AccordionContent>
                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                      {client.steps.map((step, index) => (
                        <li key={index} className="leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Tips:</strong> Om du fortfarande inte får våra mail, kontrollera att 
                adressen <code className="bg-background px-1 py-0.5 rounded">noreply@gymdagboken.se</code> inte 
                är blockerad i dina e-postinställningar.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailHelp;
