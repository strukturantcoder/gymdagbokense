import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-12 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tillbaka
        </Button>

        <h1 className="text-4xl font-display font-bold mb-8">Integritetspolicy</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">
            Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">1. Inledning</h2>
            <p>
              Gymdagboken ("vi", "oss", "vår") värnar om din integritet. Denna integritetspolicy 
              förklarar hur vi samlar in, använder och skyddar din personliga information när du 
              använder vår tjänst.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">2. Information vi samlar in</h2>
            <p>Vi samlar in följande typer av information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Kontoinformation:</strong> E-postadress, visningsnamn och profilbild.</li>
              <li><strong>Träningsdata:</strong> Träningsprogram, loggade pass, vikter, sets och reps.</li>
              <li><strong>Användningsdata:</strong> Information om hur du använder tjänsten.</li>
              <li><strong>Enhetsinformation:</strong> Typ av enhet, webbläsare och operativsystem.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">3. Hur vi använder din information</h2>
            <p>Vi använder din information för att:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tillhandahålla och förbättra våra tjänster</li>
              <li>Generera personaliserade träningsprogram</li>
              <li>Spåra din träningsframgång och statistik</li>
              <li>Möjliggöra sociala funktioner som vänner och utmaningar</li>
              <li>Skicka viktiga uppdateringar om tjänsten</li>
              <li>Förbättra säkerheten och förhindra bedrägerier</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">4. Delning av information</h2>
            <p>
              Vi säljer aldrig din personliga information. Vi delar endast information med:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Tjänsteleverantörer:</strong> Som hjälper oss att driva tjänsten (t.ex. hosting, betalningar).</li>
              <li><strong>Andra användare:</strong> Om du väljer att använda sociala funktioner.</li>
              <li><strong>Myndigheter:</strong> Om det krävs enligt lag.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">5. Datasäkerhet</h2>
            <p>
              Vi använder branschstandardiserade säkerhetsåtgärder för att skydda din information, 
              inklusive kryptering och säkra serverinfrastrukturer. Ingen metod för överföring över 
              internet är dock 100% säker.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">6. Dina rättigheter</h2>
            <p>Enligt GDPR har du rätt att:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Få tillgång till din personliga information</li>
              <li>Korrigera felaktig information</li>
              <li>Radera din information ("rätten att bli glömd")</li>
              <li>Exportera din data i ett maskinläsbart format</li>
              <li>Invända mot viss behandling av din information</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">7. Kontakta oss</h2>
            <p>
              Om du har frågor om denna integritetspolicy eller vill utöva dina rättigheter, 
              kontakta oss på: <a href="mailto:info@gymdagboken.se" className="text-gym-orange hover:underline">info@gymdagboken.se</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}