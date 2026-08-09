import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

export default function AboutAds() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Så finansieras Gymdagboken – om annonser</title>
        <meta
          name="description"
          content="Gymdagboken är gratis och finansieras delvis av annonssamarbeten och provision från länkar i blogginlägg. Priset påverkas inte och alla länkar är märkta."
        />
        <link rel="canonical" href="https://gymdagboken.se/om-annonser" />
        <meta property="og:title" content="Så finansieras Gymdagboken – om annonser" />
        <meta property="og:url" content="https://gymdagboken.se/om-annonser" />
      </Helmet>

      <div className="container px-4 py-12 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tillbaka
        </Button>

        <h1 className="text-4xl font-display font-bold mb-8">Så finansieras Gymdagboken</h1>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg">
            Gymdagboken är gratis att använda. För att kunna driva och utveckla tjänsten
            finansieras sajten delvis av annonssamarbeten.
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">Annonser och samarbeten</h2>
            <p>
              Delar av tjänsten visar annonser, och vi samarbetar ibland med företag inom träning
              och hälsa. Intäkterna gör det möjligt att hålla alla funktioner öppna för alla
              användare utan betalvägg.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">Provision från länkar</h2>
            <p>
              När ett blogginlägg länkar till en butik kan vi få provision om du väljer att handla
              via länken. Det påverkar inte priset för dig – du betalar precis lika mycket som om du
              hade gått direkt till butiken.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">Vårt oberoende</h2>
            <p>
              Provision styr inte vad vi rekommenderar. Innehållet skrivs utifrån vad vi tycker är
              relevant och användbart för dig som tränar, oavsett om det finns ett samarbete bakom
              en produkt eller inte.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">Tydlig märkning</h2>
            <p>
              Alla sådana länkar är märkta så att du alltid vet när ett innehåll innehåller
              annonslänkar eller är en del av ett samarbete.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-display font-semibold text-foreground">Frågor?</h2>
            <p>
              Undrar du något om hur vi finansieras? Hör av dig på{" "}
              <a href="mailto:info@gymdagboken.se" className="text-gym-orange hover:underline">
                info@gymdagboken.se
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}