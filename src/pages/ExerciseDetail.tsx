import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import LibraryCTA from "@/components/library/LibraryCTA";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { truncateAtWord } from "@/lib/seo";
import { categoryLabel } from "./Exercises";

interface Mistake {
  fel: string;
  fix: string;
}

interface Exercise {
  slug: string;
  name: string;
  category: string | null;
  muscles: string[] | null;
  equipment: string | null;
  level: string | null;
  steps: string[] | null;
  mistakes: unknown;
  intro: string | null;
}

interface RelatedExercise {
  slug: string;
  name: string;
  equipment: string | null;
  level: string | null;
}

const ExerciseDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [related, setRelated] = useState<RelatedExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setExercise(null);
    setRelated([]);

    const load = async () => {
      const { data } = await supabase
        .from("exercises")
        .select("slug, name, category, muscles, equipment, level, steps, mistakes, intro")
        .eq("slug", slug ?? "")
        .eq("is_published", true)
        .maybeSingle();

      if (cancelled) return;
      setExercise(data as Exercise | null);
      setLoading(false);

      if (data?.category) {
        const { data: rel } = await supabase
          .from("exercises")
          .select("slug, name, equipment, level")
          .eq("is_published", true)
          .eq("category", data.category)
          .neq("slug", data.slug)
          .limit(3);
        if (!cancelled) setRelated(rel ?? []);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-16">
          <p className="text-muted-foreground">Laddar övning…</p>
        </main>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Övningen hittades inte | Gymdagboken</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <Header />
        <main className="container px-4 py-16">
          <h1 className="font-display text-3xl font-bold mb-4">Övningen hittades inte</h1>
          <p className="text-muted-foreground mb-6">
            Vi hittade ingen övning med den adressen. Den kan ha bytt namn.
          </p>
          <Button asChild className="bg-gym-orange hover:bg-gym-orange/90">
            <Link to="/ovningar">Till övningsbanken</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const description = truncateAtWord(exercise.intro, 155);
  const url = `https://gymdagboken.se/ovningar/${exercise.slug}`;
  const title = `${exercise.name} – teknik, vanliga fel och tips | Gymdagboken`;
  const steps = exercise.steps ?? [];
  const mistakes = Array.isArray(exercise.mistakes) ? (exercise.mistakes as Mistake[]) : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: exercise.name,
    description,
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: `Steg ${i + 1}`,
      text: s,
    })),
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={url} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <Header />

      <main className="container px-4 py-12 max-w-3xl">
        <Link to="/ovningar" className="text-sm text-gym-orange hover:underline">
          ← Övningsbank
        </Link>

        <h1 className="font-display text-4xl font-bold mt-4 mb-4">{exercise.name}</h1>
        <p className="text-lg text-muted-foreground mb-6">{exercise.intro}</p>

        <div className="rounded-xl border border-border/50 bg-gym-charcoal p-5 mb-10 grid gap-3 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Muskler</p>
            <p className="font-medium">{(exercise.muscles ?? []).join(", ")}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Utrustning</p>
            <p className="font-medium">{exercise.equipment}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Nivå</p>
            <p className="font-medium capitalize">{exercise.level}</p>
          </div>
        </div>

        <section className="mb-10">
          <h2 className="font-display text-2xl font-bold mb-4">Så gör du</h2>
          <ol className="list-decimal pl-5 space-y-3 text-muted-foreground">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="font-display text-2xl font-bold mb-4">Vanliga fel</h2>
          <div className="space-y-4">
            {mistakes.map((m, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-gym-charcoal p-5">
                <h3 className="font-display text-lg font-semibold mb-1">{m.fel}</h3>
                <p className="text-muted-foreground text-sm">{m.fix}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mb-10">
          <AdBanner format="horizontal" placement="exercise_detail" />
        </div>

        {related.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-2xl font-bold mb-4">
              Fler övningar för {categoryLabel(exercise.category).toLowerCase()}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/ovningar/${r.slug}`}
                  className="rounded-xl border border-border/50 bg-gym-charcoal p-5 hover:border-gym-orange/60 transition-colors"
                >
                  <h3 className="font-display text-lg font-semibold mb-1">{r.name}</h3>
                  <p className="text-sm text-muted-foreground">{r.equipment}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <LibraryCTA />
      </main>

      <Footer />
    </div>
  );
};

export default ExerciseDetail;
