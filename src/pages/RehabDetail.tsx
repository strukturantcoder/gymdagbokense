import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LibraryCTA from "@/components/library/LibraryCTA";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { truncateAtWord } from "@/lib/seo";

interface RehabExercise {
  namn: string;
  utforande: string;
  dos: string;
}

interface Protocol {
  slug: string;
  name: string;
  background: string | null;
  seek_care_if: string[] | null;
  exercises: unknown;
  avoid_until_better: string[] | null;
  intro: string | null;
}

const RehabDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setProtocol(null);

    supabase
      .from("rehab_protocols")
      .select("slug, name, background, seek_care_if, exercises, avoid_until_better, intro")
      .eq("slug", slug ?? "")
      .eq("is_published", true)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProtocol(data as Protocol | null);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 py-16">
          <p className="text-muted-foreground">Laddar…</p>
        </main>
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet>
          <title>Sidan hittades inte | Gymdagboken</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <Header />
        <main className="container px-4 py-16">
          <h1 className="font-display text-3xl font-bold mb-4">Sidan hittades inte</h1>
          <p className="text-muted-foreground mb-6">
            Vi hittade ingen rehabguide med den adressen.
          </p>
          <Button asChild className="bg-gym-orange hover:bg-gym-orange/90">
            <Link to="/rehab">Till rehabbiblioteket</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const description = truncateAtWord(protocol.intro, 155);
  const url = `https://gymdagboken.se/rehab/${protocol.slug}`;
  const title = `${protocol.name} – övningar och råd | Gymdagboken`;
  const exercises = Array.isArray(protocol.exercises)
    ? (protocol.exercises as RehabExercise[])
    : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: protocol.name,
    description,
    mainEntityOfPage: url,
    publisher: { "@type": "Organization", name: "Gymdagboken" },
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
        <Link to="/rehab" className="text-sm text-gym-orange hover:underline">
          ← Rehab och krämpor
        </Link>

        <h1 className="font-display text-4xl font-bold mt-4 mb-4">{protocol.name}</h1>
        <p className="text-lg text-muted-foreground mb-10">{protocol.intro}</p>

        {protocol.background && (
          <section className="mb-10">
            <h2 className="font-display text-2xl font-bold mb-3">Vad det brukar handla om</h2>
            <p className="text-muted-foreground">{protocol.background}</p>
          </section>
        )}

        {exercises.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-2xl font-bold mb-4">Övningar</h2>
            <div className="space-y-4">
              {exercises.map((e, i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-gym-charcoal p-5">
                  <h3 className="font-display text-lg font-semibold mb-1">{e.namn}</h3>
                  <p className="text-muted-foreground text-sm mb-2">{e.utforande}</p>
                  <p className="text-sm text-gym-orange">{e.dos}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {(protocol.avoid_until_better ?? []).length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-2xl font-bold mb-3">Undvik tills det är bättre</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              {(protocol.avoid_until_better ?? []).map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </section>
        )}

        {(protocol.seek_care_if ?? []).length > 0 && (
          <section className="mb-6 rounded-xl border-2 border-destructive/60 bg-destructive/10 p-6">
            <h2 className="font-display text-2xl font-bold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Sök vård om
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              {(protocol.seek_care_if ?? []).map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-sm text-muted-foreground mb-10">
          Detta är allmän information och inte medicinsk rådgivning. Är du osäker på dina besvär,
          kontakta vården.
        </p>

        <LibraryCTA />
      </main>

      <Footer />
    </div>
  );
};

export default RehabDetail;
