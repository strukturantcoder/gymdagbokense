import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const LibraryCTA = () => (
  <section className="rounded-xl border border-border/50 bg-gym-charcoal p-6 md:p-8">
    <h2 className="font-display text-2xl font-bold mb-2">Logga passet i Gymdagboken</h2>
    <p className="text-muted-foreground mb-5 max-w-2xl">
      Skriv upp vikter, set och reps direkt i appen så ser du svart på vitt när du blir starkare.
      Alla funktioner är gratis.
    </p>
    <Button asChild className="bg-gym-orange hover:bg-gym-orange/90">
      <Link to="/auth">Skapa gratis konto</Link>
    </Button>
  </section>
);

export default LibraryCTA;
