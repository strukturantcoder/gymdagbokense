import { Helmet } from 'react-helmet-async';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, User, ChevronRight, Dumbbell, Mountain, Shirt, Apple, Activity, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Footer from '@/components/Footer';

// Affiliate links for each advertiser
const affiliateLinks = {
  gymgrossisten: 'https://clk.tradedoubler.com/click?p=70361&a=3465011&g=17342194',
  bodystore: 'https://clk.tradedoubler.com/click?p=70363&a=3465011&g=26021418',
  aboutYou: 'https://clk.tradedoubler.com/click?p=382764&a=3465011&g=25913394',
  racket: 'https://clk.tradedoubler.com/click?p=311300&a=3465011&g=24930416',
  alpinGaraget: 'https://statics.alpingaraget.se/click?p=374688&a=3465011&g=25827974',
};

interface AffiliateBox {
  name: string;
  description: string;
  link: string;
  cta: string;
}

const getAffiliateBoxes = (slug: string): AffiliateBox[] => {
  switch (slug) {
    case 'basta-kosttillskotten-for-muskelbyggande':
      return [
        {
          name: 'Gymgrossisten',
          description: 'Sveriges största sortiment av kosttillskott för träning. Protein, kreatin, BCAA och mycket mer.',
          link: affiliateLinks.gymgrossisten,
          cta: 'Handla kosttillskott →'
        },
        {
          name: 'Bodystore',
          description: 'Kvalitetsprodukter för hälsa och träning. Stort utbud av proteinpulver och vitaminer.',
          link: affiliateLinks.bodystore,
          cta: 'Se utbudet på Bodystore →'
        }
      ];
    case 'traningskläder-som-forbattrar-din-prestation':
      return [
        {
          name: 'About You',
          description: 'Stilfulla träningskläder från ledande märken. Hitta kläder som kombinerar funktion och stil.',
          link: affiliateLinks.aboutYou,
          cta: 'Shoppa träningskläder →'
        }
      ];
    case 'padel-och-tennis-komplett-guide':
      return [
        {
          name: 'Racket',
          description: 'Specialister på racketsport. Stort utbud av padel- och tennisracketar för alla nivåer.',
          link: affiliateLinks.racket,
          cta: 'Se racketar hos Racket →'
        }
      ];
    case 'skidtraning-forbered-dig-for-sasongen':
      return [
        {
          name: 'Alpin Garaget',
          description: 'Din destination för skidutrustning. Skidor, pjäxor, kläder och tillbehör för vintersäsongen.',
          link: affiliateLinks.alpinGaraget,
          cta: 'Förbered säsongen →'
        }
      ];
    case 'styrketraning-for-nyborjare':
      return [
        {
          name: 'Gymgrossisten',
          description: 'Komplettera din träning med rätt kosttillskott. Protein för återhämtning och muskelbyggande.',
          link: affiliateLinks.gymgrossisten,
          cta: 'Handla tillskott →'
        }
      ];
    default:
      return [];
  }
};

const AffiliateSection = ({ boxes }: { boxes: AffiliateBox[] }) => {
  if (boxes.length === 0) return null;
  
  return (
    <div className="my-8 space-y-4">
      <h3 className="font-display font-bold text-lg flex items-center gap-2">
        <ExternalLink className="w-5 h-5 text-gym-orange" />
        Rekommenderade produkter
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {boxes.map((box, index) => (
          <a
            key={index}
            href={box.link}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all group"
          >
            <div className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
              {box.name}
            </div>
            <p className="text-sm text-muted-foreground mb-3">{box.description}</p>
            <span className="text-sm font-medium text-gym-orange group-hover:text-gym-orange/80 transition-colors">
              {box.cta}
            </span>
          </a>
        ))}
      </div>
      <p className="text-xs text-muted-foreground/70 italic">
        * Länkarna ovan är affiliatelänkar. Vi kan få en liten provision vid köp, utan extra kostnad för dig.
      </p>
    </div>
  );
};

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: string;
  icon: React.ElementType;
  readTime: string;
  date: string;
  content: string;
  metaDescription: string;
  keywords: string[];
}

const blogPosts: BlogPost[] = [
  {
    slug: 'basta-kosttillskotten-for-muskelbyggande',
    title: 'Bästa kosttillskotten för muskelbyggande 2024',
    description: 'En komplett guide till vilka kosttillskott som faktiskt fungerar för att bygga muskler och förbättra din träning.',
    category: 'Kosttillskott',
    icon: Apple,
    readTime: '8 min',
    date: '2024-12-15',
    metaDescription: 'Upptäck de bästa kosttillskotten för muskelbyggande. Komplett guide om protein, kreatin, BCAA och mer för optimal träningsresultat.',
    keywords: ['kosttillskott', 'protein', 'kreatin', 'muskelbyggande', 'gymgrossisten', 'bodystore'],
    content: `
## Varför kosttillskott kan hjälpa din träning

Kosttillskott är precis vad namnet antyder - ett tillägg till din kost. De ersätter aldrig en välbalanserad kost, men kan hjälpa dig nå dina träningsmål snabbare.

### De viktigaste tillskotten för muskelbyggande

#### 1. Proteinpulver
Protein är byggstenen för muskler. Ett proteinpulver gör det enkelt att få i sig tillräckligt med protein, särskilt efter träning.

- **Vassleprotein (Whey)**: Snabbt upptag, perfekt efter träning
- **Kasein**: Långsamt upptag, bra före sömn
- **Växtbaserat**: Alternativ för veganer

**Rekommenderad dos**: 1.6-2.2g protein per kg kroppsvikt dagligen.

#### 2. Kreatin
Kreatin är det mest studerade och effektiva tillskottet för styrketräning. Det ökar muskelstyrka, power output och kan hjälpa med återhämtning.

**Rekommenderad dos**: 3-5g kreatinmonohydrat dagligen.

#### 3. BCAA (Grenade aminosyror)
BCAA kan hjälpa till att minska muskelömhet och stödja återhämtning, särskilt vid träning i fastat tillstånd.

### Tips för att välja rätt tillskott

1. **Kvalitet framför pris** - Välj etablerade märken
2. **Läs ingredienserna** - Undvik onödiga tillsatser
3. **Börja enkelt** - Fokusera på grunderna först

### Sammanfattning

Fokusera först på protein och kreatin - de har starkast vetenskapligt stöd. Lägg till andra tillskott efter behov och träningsnivå.
    `
  },
  {
    slug: 'traningskläder-som-forbattrar-din-prestation',
    title: 'Träningskläder som förbättrar din prestation',
    description: 'Rätt träningskläder kan göra stor skillnad för din komfort och prestation. Här är vad du bör tänka på.',
    category: 'Utrustning',
    icon: Shirt,
    readTime: '6 min',
    date: '2024-12-10',
    metaDescription: 'Guide till träningskläder som förbättrar din prestation. Lär dig välja rätt material, passform och funktioner för gymmet.',
    keywords: ['träningskläder', 'gymkläder', 'about you', 'sportkläder', 'funktionskläder'],
    content: `
## Varför rätt träningskläder spelar roll

Rätt kläder handlar inte bara om stil - de påverkar din rörlighet, temperaturreglering och självförtroende på gymmet.

### Material att leta efter

#### Fuktavledande tyger
Syntetiska material som polyester och nylon transporterar svett bort från kroppen och håller dig torr.

#### Stretch och rörlighet
Elastan/Spandex ger stretch som följer dina rörelser utan att begränsa.

#### Andningsförmåga
Mesh-paneler och ventilationszoner hjälper kroppen att andas under intensiva pass.

### Kläder för olika träningstyper

**Styrketräning:**
- Tajta eller halvtajta byxor för att se benposition
- Bekväm t-shirt eller tank top
- Stabila skor med platt sula

**Konditionsträning:**
- Lätta, andningsförmå kläder
- Löparskor med dämpning
- Reflex för utomhusträning

**Yoga/Stretching:**
- Flexibla, bekväma kläder
- Tajts eller mjuka byxor
- Barfota eller tunna skor

### Investera i kvalitet

Kvalitetskläder håller längre och presterar bättre. Det är värt att investera i några bra basplagg istället för många billiga.
    `
  },
  {
    slug: 'padel-och-tennis-komplett-guide',
    title: 'Padel och tennis: Komplett guide för nybörjare',
    description: 'Allt du behöver veta för att komma igång med padel eller tennis - utrustning, teknik och träning.',
    category: 'Racketsport',
    icon: Activity,
    readTime: '10 min',
    date: '2024-12-05',
    metaDescription: 'Komplett guide till padel och tennis för nybörjare. Lär dig välja rack, teknik och hur du tränar för bättre spel.',
    keywords: ['padel', 'tennis', 'racketsport', 'padelracket', 'tennisracket', 'nybörjare'],
    content: `
## Racketsporter - träning och socialt i ett

Padel och tennis är fantastiska sporter som kombinerar konditionsträning, koordination och social interaktion.

### Padel vs Tennis - Skillnader

| Aspekt | Padel | Tennis |
|--------|-------|--------|
| Bana | Mindre, med väggar | Större, utan väggar |
| Rack | Kortare, utan strängar | Längre, med strängar |
| Boll | Liknande men lägre tryck | Standard tennisboll |
| Spelstil | Mer strategi, väggspel | Mer kraft och löpning |

### Välja rätt racket

#### Padelracket
- **Rund form**: Bäst för nybörjare, störst sweet spot
- **Droppform**: Balans mellan kontroll och kraft
- **Diamantform**: Mest kraft, för avancerade

#### Tennisracket
- **Större huvud (100+ sq in)**: Mer förlåtande
- **Lättare vikt (260-280g)**: Lättare att manövrera
- **Rätt greppstorlek**: Avgörande för kontroll

### Fysisk träning för racketsporter

Racketsporter kräver:
- **Snabbhet och explosivitet**
- **Uthållighet**
- **Rotatorkuffstyrka**
- **Benstyrka för snabba riktningsändringar**

Komplettera ditt spel med styrketräning för bättre prestation och skadeprevention.
    `
  },
  {
    slug: 'skidtraning-forbered-dig-for-sasongen',
    title: 'Skidträning: Förbered dig för säsongen',
    description: 'Så tränar du inför skidsäsongen för bättre prestationer och färre skador på pistarna.',
    category: 'Vintersport',
    icon: Mountain,
    readTime: '7 min',
    date: '2024-11-25',
    metaDescription: 'Komplett guide till skidträning och förberedelser inför säsongen. Styrketräning, kondition och utrustning för bättre åkning.',
    keywords: ['skidträning', 'skidåkning', 'alpint', 'vintersport', 'benstyrka', 'utrustning'],
    content: `
## Förberedd för pistarna

En bra skidsäsong börjar med förberedd träning. Rätt kondition och styrka ger dig mer uthållighet, bättre teknik och färre skador.

### Muskelgrupper att fokusera på

#### Ben och höfter
Skidåkning kräver stark muskulatur i:
- **Quadriceps**: Håller dig i skidposition
- **Hamstrings**: Stabiliserar knäna
- **Gluteus**: Kraft i svängar och hopp
- **Vaderna**: Kantkontroll och balans

#### Core-styrka
En stark bål ger bättre balans och överför kraft effektivare mellan överkropp och underkropp.

### Rekommenderade övningar

**Benövningar:**
- Knäböj (squat)
- Utfall (lunges)
- Väggsitta
- Box jumps

**Core-övningar:**
- Plankan
- Ryska vridningar
- Dead bugs
- Bird dogs

**Kondition:**
- Löpning i backar
- Cykling
- Intervallträning

### Utrustning för säsongen

Investera i bra utrustning:
- **Pjäxor som passar**: Viktigast av allt
- **Skidor för din nivå**: Nybörjarvänliga eller avancerade
- **Hjälm**: Obligatoriskt för säkerhet
- **Funktionsunderkläder**: Håller dig varm och torr

### Träningsschema före säsong

**8-12 veckor före:** Bygg grundstyrka
**4-8 veckor före:** Öka intensitet och explosivitet
**Sista veckorna:** Underhåll och vila
    `
  },
  {
    slug: 'styrketraning-for-nyborjare',
    title: 'Styrketräning för nybörjare: Komplett startguide',
    description: 'Allt du behöver veta för att börja styrketräna - övningar, teknik och hur du skapar ditt första program.',
    category: 'Styrketräning',
    icon: Dumbbell,
    readTime: '12 min',
    date: '2024-12-01',
    metaDescription: 'Komplett guide till styrketräning för nybörjare. Lär dig grunderna, bästa övningarna och hur du skapar ett effektivt träningsprogram.',
    keywords: ['styrketräning', 'nybörjare', 'gymträning', 'träningsprogram', 'övningar', 'muskelbyggande'],
    content: `
## Välkommen till styrketräning

Styrketräning är en av de bästa sakerna du kan göra för din hälsa. Det bygger muskler, stärker ben, förbättrar ämnesomsättningen och ökar livskvaliteten.

### Grundläggande principer

#### Progressiv överbelastning
Gradvis öka belastningen över tid - mer vikt, fler reps eller fler set. Detta tvingar kroppen att anpassa sig och bli starkare.

#### Återhämtning
Muskler växer under vila, inte under träning. Ge varje muskelgrupp 48-72 timmar vila mellan pass.

#### Kost och sömn
Protein för muskelbyggande, kolhydrater för energi, och 7-9 timmars sömn för optimal återhämtning.

### De bästa övningarna för nybörjare

**Överkropp:**
- Bänkpress
- Rodd
- Axelpress
- Biceps curls
- Triceps extensions

**Underkropp:**
- Knäböj
- Marklyft
- Utfall
- Benpress
- Vadpress

**Core:**
- Plankan
- Crunches
- Russian twists

### Ditt första träningsprogram

Som nybörjare rekommenderas ett helkroppsprogram 2-3 gånger per vecka:

**Pass A:**
- Knäböj: 3x8-10
- Bänkpress: 3x8-10
- Rodd: 3x8-10
- Axelpress: 2x10-12
- Plankan: 3x30 sek

**Pass B:**
- Marklyft: 3x8-10
- Benpress: 3x10-12
- Latsdrag: 3x10-12
- Utfall: 2x10 per ben
- Crunches: 3x15

### Tips för framgång

1. **Börja lätt** - Lär dig tekniken först
2. **Var konsekvent** - Regelbundenhet slår intensitet
3. **Logga din träning** - Spåra progress med Gymdagboken
4. **Ha tålamod** - Resultat tar tid
    `
  }
];

export default function Blog() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // If slug is provided, show single blog post
  if (slug) {
    const post = blogPosts.find(p => p.slug === slug);
    
    if (!post) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Artikeln hittades inte</h1>
            <Button onClick={() => navigate('/blogg')}>Tillbaka till bloggen</Button>
          </div>
        </div>
      );
    }

    return (
      <>
        <Helmet>
          <title>{post.title} | Gymdagboken</title>
          <meta name="description" content={post.metaDescription} />
          <meta name="keywords" content={post.keywords.join(', ')} />
          <meta property="og:title" content={post.title} />
          <meta property="og:description" content={post.metaDescription} />
          <meta property="og:type" content="article" />
          <link rel="canonical" href={`https://gymdagboken.se/blogg/${post.slug}`} />
        </Helmet>

        <div className="min-h-screen bg-background overflow-x-hidden">
          <header className="border-b border-border bg-card">
            <div className="container px-4 py-4 flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/blogg')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="font-display text-xl font-bold">BLOGG</span>
              </div>
            </div>
          </header>

          <main className="container px-4 py-8 max-w-3xl mx-auto">
            <article>
              <header className="mb-8">
                <Badge className="mb-4">{post.category}</Badge>
                <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">{post.title}</h1>
                <div className="flex items-center gap-4 text-muted-foreground text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(post.date).toLocaleDateString('sv-SE')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {post.readTime} läsning
                  </span>
                </div>
              </header>

              <div 
                className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-display prose-h2:text-2xl prose-h3:text-xl prose-a:text-primary"
                dangerouslySetInnerHTML={{ 
                  __html: post.content
                    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/^- (.*$)/gim, '<li>$1</li>')
                    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
                    .replace(/\n\n/g, '</p><p>')
                    .replace(/^(?!<[hup])/gim, '<p>')
                }}
              />

              <AffiliateSection boxes={getAffiliateBoxes(post.slug)} />

              <div className="mt-12 p-6 bg-primary/10 rounded-xl border border-primary/30">
                <h3 className="font-display font-bold text-lg mb-2">Börja logga din träning</h3>
                <p className="text-muted-foreground mb-4">
                  Använd Gymdagboken för att spåra dina framsteg, skapa personliga program med AI och nå dina träningsmål.
                </p>
                <Button onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90">
                  Kom igång gratis
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </article>
          </main>

          <Footer />
        </div>
      </>
    );
  }

  // Blog listing page
  return (
    <>
      <Helmet>
        <title>Träningsblogg | Gymdagboken - Tips & Guider för träning</title>
        <meta name="description" content="Läs våra artiklar om styrketräning, kosttillskott, träningskläder och mer. Expertråd för att förbättra din träning och hälsa." />
        <meta name="keywords" content="träningsblogg, styrketräning, kosttillskott, träningsprogram, gymtips, fitness" />
        <link rel="canonical" href="https://gymdagboken.se/blogg" />
      </Helmet>

      <div className="min-h-screen bg-background overflow-x-hidden">
        <header className="border-b border-border bg-card">
          <div className="container px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">BLOGG</span>
            </div>
          </div>
        </header>

        <main className="container px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">Träningsblogg</h1>
              <p className="text-muted-foreground text-lg">
                Tips, guider och inspiration för din träning
              </p>
            </motion.div>

            <div className="grid gap-6">
              {blogPosts.map((post, index) => {
                const Icon = post.icon;
                return (
                  <motion.div
                    key={post.slug}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link to={`/blogg/${post.slug}`}>
                      <Card className="hover:border-primary/50 transition-all hover:shadow-lg group">
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gym-orange/20 to-amber-500/10 flex items-center justify-center shrink-0 group-hover:from-gym-orange/30 transition-colors">
                              <Icon className="w-6 h-6 text-gym-orange" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs">{post.category}</Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {post.readTime}
                                </span>
                              </div>
                              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                {post.title}
                              </CardTitle>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <CardDescription className="text-sm">
                            {post.description}
                          </CardDescription>
                          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.date).toLocaleDateString('sv-SE', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 text-center p-8 bg-gradient-to-br from-primary/10 to-amber-500/5 rounded-xl border border-primary/20"
            >
              <h2 className="font-display font-bold text-xl mb-3">Redo att börja träna?</h2>
              <p className="text-muted-foreground mb-4">
                Skapa ett konto och få ett AI-genererat träningsprogram anpassat för dig.
              </p>
              <Button onClick={() => navigate('/auth')} size="lg">
                Kom igång gratis
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
