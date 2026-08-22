import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const CATEGORIES = [
  { value: "ben", label: "Ben" },
  { value: "overkropp", label: "Överkropp" },
  { value: "bal", label: "Bål" },
  { value: "helkropp", label: "Helkropp" },
];

export const categoryLabel = (value: string | null) =>
  CATEGORIES.find((c) => c.value === value)?.label ?? value ?? "";

interface ExerciseCard {
  slug: string;
  name: string;
  category: string | null;
  equipment: string | null;
  level: string | null;
}

const Exercises = () => {
  const [exercises, setExercises] = useState<ExerciseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("alla");

  useEffect(() => {
    supabase
      .from("exercises")
      .select("slug, name, category, equipment, level")
      .eq("is_published", true)
      .order("name")
      .then(({ data }) => {
        setExercises(data ?? []);
        setLoading(false);
      });
  }, []);

  const visible = filter === "alla" ? exercises : exercises.filter((e) => e.category === filter);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Helmet>
        <title>Övningsbank – teknik och vanliga fel för gymövningar | Gymdagboken</title>
        <meta
          name="description"
          content="Övningsbank med teknik, vanliga fel och tips för de vanligaste gymövningarna. Filtrera på ben, överkropp, bål och helkropp."
        />
        <link rel="canonical" href="https://gymdagboken.se/ovningar" />
        <meta property="og:title" content="Övningsbank | Gymdagboken" />
        <meta
          property="og:description"
          content="Teknik, vanliga fel och tips för de vanligaste gymövningarna."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://gymdagboken.se/ovningar" />
      </Helmet>
      <Header />

      <main className="container px-4 py-12">
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Övningsbank</h1>
        <p className="text-muted-foreground max-w-2xl mb-8">
          Så utför du de vanligaste gymövningarna: stegvis teknik, vilka muskler som jobbar och de
          misstag som brukar sätta käppar i hjulet – med konkreta fixar.
        </p>

        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            variant={filter === "alla" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("alla")}
            className={filter === "alla" ? "bg-gym-orange hover:bg-gym-orange/90" : ""}
          >
            Alla
          </Button>
          {CATEGORIES.map((c) => (
            <Button
              key={c.value}
              variant={filter === c.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(c.value)}
              className={filter === c.value ? "bg-gym-orange hover:bg-gym-orange/90" : ""}
            >
              {c.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted-foreground">Laddar övningar…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((e) => (
              <Link
                key={e.slug}
                to={`/ovningar/${e.slug}`}
                className="rounded-xl border border-border/50 bg-gym-charcoal p-5 hover:border-gym-orange/60 transition-colors"
              >
                <h2 className="font-display text-xl font-semibold mb-2">{e.name}</h2>
                <p className="text-sm text-gym-orange mb-1">{categoryLabel(e.category)}</p>
                <p className="text-sm text-muted-foreground">{e.equipment}</p>
                <p className="text-sm text-muted-foreground capitalize">Nivå: {e.level}</p>
              </Link>
            ))}
          </div>
        )}

        <div className="py-10">
          <AdBanner format="leaderboard" placement="exercises_list" />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Exercises;
