import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Cookies() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-12 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tillbaka
        </Button>

        <h1 className="text-4xl font-display font-bold mb-8">Cookiepolicy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">
            Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">1. Vad är cookies?</h2>
            <p>
              Cookies är små textfiler som lagras på din enhet när du besöker en webbplats. 
              De används för att komma ihåg dina inställningar, förbättra din upplevelse 
              och samla in statistik om hur webbplatsen används.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">2. Hur vi använder cookies</h2>
            <p>Gymdagboken använder cookies för följande ändamål:</p>
            
            <h3 className="text-xl font-semibold text-foreground mt-6">Nödvändiga cookies</h3>
            <p>
              Dessa cookies är avgörande för att tjänsten ska fungera korrekt. De används för:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Autentisering och inloggning</li>
              <li>Sessionhantering</li>
              <li>Säkerhetsfunktioner</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mt-6">Funktionella cookies</h3>
            <p>
              Dessa cookies förbättrar din upplevelse genom att komma ihåg dina val:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Språkinställningar</li>
              <li>Temapreferenser (mörkt/ljust läge)</li>
              <li>Senast använda inställningar</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mt-6">Analytiska cookies</h3>
            <p>
              Dessa cookies hjälper oss att förstå hur besökare använder tjänsten:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Antal besökare och sidvisningar</li>
              <li>Vilka funktioner som används mest</li>
              <li>Felrapportering och prestandamätning</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">3. Cookies vi använder</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-secondary">
                    <th className="border border-border p-3 text-left text-foreground">Namn</th>
                    <th className="border border-border p-3 text-left text-foreground">Typ</th>
                    <th className="border border-border p-3 text-left text-foreground">Syfte</th>
                    <th className="border border-border p-3 text-left text-foreground">Livslängd</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border p-3">sb-*-auth-token</td>
                    <td className="border border-border p-3">Nödvändig</td>
                    <td className="border border-border p-3">Autentisering</td>
                    <td className="border border-border p-3">Session</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3">theme</td>
                    <td className="border border-border p-3">Funktionell</td>
                    <td className="border border-border p-3">Temainställning</td>
                    <td className="border border-border p-3">1 år</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3">_ga</td>
                    <td className="border border-border p-3">Analytisk</td>
                    <td className="border border-border p-3">Google Analytics</td>
                    <td className="border border-border p-3">2 år</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">4. Hantera cookies</h2>
            <p>
              Du kan kontrollera och hantera cookies på flera sätt:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Webbläsarinställningar:</strong> De flesta webbläsare låter dig blockera 
                eller ta bort cookies via inställningarna.
              </li>
              <li>
                <strong>Tredjepartsverktyg:</strong> Det finns tillägg som kan blockera 
                specifika typer av cookies.
              </li>
            </ul>
            <p className="font-semibold text-foreground">
              Observera: Om du blockerar nödvändiga cookies kan vissa funktioner i tjänsten 
              sluta fungera korrekt.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">5. Tredjepartscookies</h2>
            <p>
              Vissa cookies sätts av tredjepartstjänster som vi använder:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Stripe:</strong> För säker betalningshantering</li>
              <li><strong>Google Analytics:</strong> För att analysera användning (anonymiserat)</li>
            </ul>
            <p>
              Dessa tjänster har sina egna integritetspolicyer som styr hur de behandlar data.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">6. Uppdateringar</h2>
            <p>
              Vi kan uppdatera denna cookiepolicy från tid till annan. Ändringar publiceras 
              på denna sida med uppdaterat datum.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">7. Kontakt</h2>
            <p>
              Har du frågor om vår användning av cookies? Kontakta oss på: <a href="mailto:info@gymdagboken.se" className="text-gym-orange hover:underline">info@gymdagboken.se</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}