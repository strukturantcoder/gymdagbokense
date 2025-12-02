import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-12 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tillbaka
        </Button>

        <h1 className="text-4xl font-display font-bold mb-8">Användarvillkor</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">
            Senast uppdaterad: {new Date().toLocaleDateString('sv-SE')}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">1. Godkännande av villkor</h2>
            <p>
              Genom att använda Gymdagboken godkänner du dessa användarvillkor. Om du inte 
              godkänner villkoren, vänligen använd inte tjänsten.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">2. Beskrivning av tjänsten</h2>
            <p>
              Gymdagboken är en digital träningsplattform som låter användare:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Skapa och följa AI-genererade träningsprogram</li>
              <li>Logga träningspass och vikter</li>
              <li>Spåra framsteg med statistik och grafer</li>
              <li>Sätta och följa personbästa-mål</li>
              <li>Koppla samman med vänner och delta i utmaningar</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">3. Användarkonto</h2>
            <p>
              För att använda tjänsten måste du skapa ett konto. Du ansvarar för att:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Ange korrekt och aktuell information</li>
              <li>Hålla ditt lösenord säkert och konfidentiellt</li>
              <li>Meddela oss omedelbart vid obehörig åtkomst till ditt konto</li>
              <li>All aktivitet som sker under ditt konto</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">4. Acceptabel användning</h2>
            <p>Du får inte:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Använda tjänsten för olagliga ändamål</li>
              <li>Dela ditt konto med andra personer</li>
              <li>Försöka få obehörig åtkomst till andra användares konton</li>
              <li>Ladda upp skadlig kod eller virus</li>
              <li>Trakassera eller kränka andra användare</li>
              <li>Använda automatiserade system för att komma åt tjänsten</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">5. Prenumerationer och betalningar</h2>
            <p>
              Gymdagboken erbjuder både gratis och premiumfunktioner. För premiumtjänster gäller:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Betalning sker i förskott för vald prenumerationsperiod</li>
              <li>Prenumerationer förnyas automatiskt om de inte avbryts</li>
              <li>Återbetalningar hanteras enligt gällande konsumentlagstiftning</li>
              <li>Vi förbehåller oss rätten att ändra priser med 30 dagars förvarning</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">6. Immateriella rättigheter</h2>
            <p>
              Allt innehåll i tjänsten, inklusive design, logotyper, text och programvara, 
              tillhör Gymdagboken eller våra licensgivare och skyddas av upphovsrättslagen.
            </p>
            <p>
              Du behåller äganderätten till din träningsdata men ger oss en licens att 
              använda den för att tillhandahålla och förbättra tjänsten.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">7. Friskrivning</h2>
            <p>
              Tjänsten tillhandahålls "i befintligt skick". Vi garanterar inte att:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tjänsten alltid kommer att vara tillgänglig eller felfri</li>
              <li>Träningsprogram kommer att ge specifika resultat</li>
              <li>All information är korrekt eller komplett</li>
            </ul>
            <p className="font-semibold text-foreground">
              Viktigt: Gymdagboken ersätter inte professionell medicinsk rådgivning. 
              Konsultera alltid en läkare innan du påbörjar ett nytt träningsprogram.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">8. Ansvarsbegränsning</h2>
            <p>
              Gymdagboken ansvarar inte för indirekta skador, utebliven vinst eller 
              dataförlust som uppstår genom användning av tjänsten, i den utsträckning 
              lagen tillåter.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">9. Ändringar av villkoren</h2>
            <p>
              Vi kan uppdatera dessa villkor från tid till annan. Vid väsentliga ändringar 
              kommer vi att meddela dig via e-post eller i tjänsten. Fortsatt användning 
              efter ändringar innebär att du godkänner de nya villkoren.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">10. Kontakt</h2>
            <p>
              För frågor om dessa villkor, kontakta oss på: <a href="mailto:support@gymdagboken.se" className="text-gym-orange hover:underline">support@gymdagboken.se</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}