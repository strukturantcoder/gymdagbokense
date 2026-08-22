import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { truncateAtWord } from "@/lib/seo";

interface RehabCard {
  slug: string;
  name: string;
  intro: string | null;
}

const Rehab = () => {
  const [items, setItems] = useState<RehabCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("rehab_protocols")
      .select("slug, name, intro")
      .eq("is_published", true)
      .order("name")
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Helmet>
        <title>Rehab och krämpor – övningar och råd vid vanlig träningsvärk | Gymdagboken</title>
        <meta
          name="description"
          content="Vanliga krämpor hos dig som tränar: vad det brukar handla om, vilka övningar som hjälper, vad du bör undvika och när du ska söka vård."
        />
        <link rel="canonical" href="https://gymdagboken.se/rehab" />
        <meta property="og:title" content="Rehab och krämpor | Gymdagboken" />
        <meta
          property="og:description"
          content="Övningar och råd vid vanliga krämpor hos dig som tränar."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://gymdagboken.se/rehab" />
      </Helmet>
      <Header />

      <main className="container px-4 py-12">
        <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Rehab och krämpor</h1>
        <p className="text-muted-foreground max-w-2xl mb-8">
          Ont i axeln, ryggen eller knäet? Här är vad besväret brukar handla om, vilka övningar som
          brukar hjälpa, vad du bör lägga på hyllan ett tag – och när det är dags att söka vård.
        </p>

        {loading ? (
          <p className="text-muted-foreground">Laddar…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => (
              <Link
                key={r.slug}
                to={`/rehab/${r.slug}`}
                className="rounded-xl border border-border/50 bg-gym-charcoal p-5 hover:border-gym-orange/60 transition-colors"
              >
                <h2 className="font-display text-xl font-semibold mb-2">{r.name}</h2>
                <p className="text-sm text-muted-foreground">{truncateAtWord(r.intro, 120)}</p>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Rehab;
