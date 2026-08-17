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
  },
  {
    slug: 'traningsdagbok-varfor-och-vad-du-ska-skriva-ner',
    title: 'Träningsdagbok: varför du ska föra en och vad du ska skriva ner',
    description: 'Vad en träningsdagbok faktiskt är bra för, vilka uppgifter som är värda att notera och vilka som bara blir brus.',
    category: 'Träningslogg',
    icon: BookOpen,
    readTime: '7 min',
    date: '2025-01-08',
    metaDescription: 'Så för du en träningsdagbok som faktiskt hjälper: vad du ska skriva ner, vad du kan hoppa över och hur du använder anteckningarna för att bli starkare.',
    keywords: ['träningsdagbok', 'träningslogg', 'logga träning', 'gymdagbok', 'träningsanteckningar'],
    content: `
## Varför minnet inte räcker

De flesta som tränar tror att de kommer ihåg vad de gjorde förra veckan. I praktiken gör man inte det. Du minns kanske vikten på det tyngsta setet, men inte hur många repetitioner du fick på det tredje, inte hur lång vila du tog, och definitivt inte hur det såg ut för sex veckor sedan. Utan de uppgifterna blir varje pass en gissning: du tar en vikt som känns rimlig i stunden, och känslan varierar med sömn, stress och hur dagen sett ut.

En träningsdagbok löser ett ganska litet men avgörande problem. Den gör förra passet till fakta i stället för minne. När du står vid stången och vet att du förra gången tog 70 kilo på tre set om åtta, och att sista setet gick lätt, är beslutet enkelt. Utan den informationen blir det 70 kilo igen, i månader.

## Vad du faktiskt behöver skriva ner

Det finns en frestelse att logga allt. Det håller sällan i mer än ett par veckor. Håll dig till de uppgifter som styr nästa beslut.

### Övning, vikt och repetitioner per set

Det här är grunden och det räcker långt. Skriv per set, inte som ett snitt. Skillnaden mellan 8, 8, 8 och 10, 8, 6 säger något om hur du fördelade ansträngningen och hur mycket du hade kvar.

### Hur nära utmattning setet var

En siffra på ansträngningen gör loggen mycket mer användbar. Om du skriver att du hade ungefär två repetitioner kvar vet du att det finns utrymme att öka. Om du skriver att du inte hade någon marginal alls är samma vikt nästa gång ett rimligt val. Det här beskrivs oftast med [RPE och RIR](/blogg/rpe-och-rir-styr-intensiteten), och det tar två sekunder per set att notera.

### Datum och vilka övningar som ingick i passet

Det behövs för att se hur ofta du faktiskt tränar en muskelgrupp, och för att upptäcka när ett pass systematiskt uteblir. Många upptäcker först i loggen att bendagen missas var tredje vecka.

### En kort anteckning när något avviker

Dålig sömn, ont i axeln, ny skostorlek, bytt gym. En rad räcker. Det är de anteckningarna som förklarar varför en vecka ser konstig ut när du tittar tillbaka i efterhand.

## Vad du kan hoppa över

Vilotider mellan set behöver du bara logga om du aktivt experimenterar med dem. Detsamma gäller tempo, gripbredd och exakt kroppsvikt varje dag. Kroppsvikt är värt att följa, men som ett veckosnitt, inte som en daglig siffra som svänger med vätska och mat. Ju fler fält du tvingar dig själv att fylla i, desto större är risken att du slutar logga alls. En logg du för i två år slår en perfekt logg du för i tre veckor.

## Hur du använder anteckningarna

En dagbok som bara samlar rader gör ingen nytta. Poängen är att titta i den vid två tillfällen.

Det första är precis innan du gör ett set. Titta på vad du gjorde senast i samma övning och bestäm dig medvetet: samma vikt, fler repetitioner, eller mer vikt. Det är hela mekaniken bakom [progressiv överbelastning](/blogg/progressiv-overbelastning-oka-belastningen), och den är svår att genomföra utan siffror.

Det andra är ungefär var sjätte till åttonde vecka. Gå tillbaka och jämför. Har vikterna i basövningarna rört sig? Har antalet set per vecka för en muskelgrupp legat still? Har du hoppat över samma pass gång på gång? Det är där en logg börjar betala tillbaka. Utvecklingen i styrketräning är långsam nog att den är osynlig från vecka till vecka men tydlig över ett kvartal.

## Vanliga misstag

Det vanligaste är att logga i efterhand, hemma på kvällen. Då blir siffrorna ungefärliga och de flesta slutar efter en tid. Skriv i stunden, mellan seten.

Det näst vanligaste är att bara logga bra pass. En logg med hål i är svår att dra slutsatser från. Ett pass där du var trött och tog lättare vikter är också information.

Det tredje är att jaga en snygg kurva i stället för att träna. Om du börjar välja övningar för att de går lätt att öka i, i stället för för att de är bra, har verktyget tagit över. Loggen ska beskriva träningen, inte styra den.

## Papper, app eller kalkylblad

Alla tre fungerar. Papper är enklast att komma igång med och sämst att söka i. Kalkylblad är flexibelt men klumpigt att fylla i mellan set. En app är mest praktisk i själva gymmet, framför allt för att den kan visa dig förra passets siffror direkt när du väljer övning, och för att den kan räkna ihop volym och personliga rekord åt dig.

Poängen är inte formatet. Poängen är att du efter tre månader ska kunna svara på frågan om du blivit starkare, med siffror i stället för en känsla. Vill du ha det utan att bygga ett eget kalkylblad kan du [skapa ett konto i Gymdagboken](/auth) och logga första passet direkt.
    \`
  },
  {
    slug: 'progressiv-overbelastning-oka-belastningen',
    title: 'Progressiv överbelastning: så ökar du belastningen utan att fastna',
    description: 'Hur du ökar belastningen över tid, vilka sätt som finns förutom mer vikt, och vad du gör när det stannar av.',
    category: 'Styrketräning',
    icon: TrendingUp,
    readTime: '8 min',
    date: '2025-01-15',
    metaDescription: 'Progressiv överbelastning förklarad i praktiken: när du ska öka vikten, hur mycket, vilka alternativ som finns och vad du gör när utvecklingen stannar.',
    keywords: ['progressiv överbelastning', 'öka vikten', 'styrketräning', 'progression', 'bli starkare'],
    content: \`
## Vad principen egentligen säger

Progressiv överbelastning betyder att kroppen behöver ett gradvis ökande krav för att fortsätta anpassa sig. Tränar du exakt likadant, med samma vikter och samma repetitioner, i sex månader, kommer utvecklingen att plana ut. Det är den mest grundläggande principen i styrketräning och samtidigt den som oftast tillämpas slarvigt.

Slarvet ligger sällan i att folk inte vet om principen. Det ligger i att de inte vet vad de gjorde förra gången, och därför inte kan öka medvetet.

## De sätt du kan öka på

Mer vikt är det uppenbara, men det är bara ett av flera sätt, och det som tar slut snabbast.

### Fler repetitioner på samma vikt

Det här är den vanligaste och mest hållbara progressionen. Klarade du 3 set om 8 på 60 kilo förra veckan siktar du på 3 set om 9 den här. När du når toppen av ditt repetitionsintervall ökar du vikten och börjar om i botten.

### Mer vikt

Öka i små steg. På överkroppsövningar som bänkpress och axelpress är 2,5 kilo ofta lagom, på knäböj och marklyft 5 kilo. Större hopp än så leder oftast till att repetitionerna faller mer än de borde och att teknik försämras.

### Fler set

Att gå från 3 till 4 set i en övning ökar den totala volymen. Det är ett effektivt verktyg men det har en gräns, både för hur mycket tid du har och för hur mycket du hinner återhämta dig från. Hur du fördelar set över veckan tas upp i [set och reps för muskeltillväxt](/blogg/set-och-reps-for-muskeltillvaxt).

### Bättre utförande

Djupare knäböj, kontrollerad sänkning, ingen studs. Att göra samma vikt med bättre teknik är en reell progression, även om siffran i loggen ser likadan ut. Skriv en anteckning när det händer så att du inte tror att du stått still.

### Kortare vila

Samma arbete på mindre tid är också en ökad belastning. Det används mer sällan i ren styrketräning men fungerar i konditionsbetonat arbete.

## Så ser det ut i praktiken

Säg att du bänkpressar och jobbar i intervallet 6 till 9 repetitioner på tre set.

Vecka 1: 70 kilo, 8, 7, 7. Du hade ungefär en repetition kvar på sista setet.
Vecka 2: 70 kilo, 9, 8, 7. Samma vikt, fler repetitioner. Det är progression.
Vecka 3: 70 kilo, 9, 9, 8. Du är i toppen av intervallet.
Vecka 4: 72,5 kilo, 7, 7, 6. Repetitionerna faller, och det är meningen. Nu börjar cykeln om.

Den här varianten kallas ofta dubbel progression, för att både repetitioner och vikt rör sig. Den fungerar för de allra flesta, i de allra flesta övningar, och kräver bara att du vet vad du gjorde förra gången.

## När det stannar av

Ingen ökar linjärt särskilt länge. Efter de första månaderna kommer perioder där siffrorna står still. Det behöver inte betyda att något är fel, men det finns några saker att gå igenom.

Titta först på om utvecklingen faktiskt står still eller om du bara tror det. Jämför med hur det såg ut för åtta veckor sedan, inte förra veckan. Framsteg blir mycket mindre synliga ju längre man tränat.

Kontrollera sedan om du äter och sover tillräckligt. Träning i underskott på båda punkterna ger sällan nya rekord. Under en period av viktnedgång är det normalt och rimligt att sikta på att behålla styrkan snarare än att öka den.

Se över volymen. Både för lite och för mycket ger stillastående. Om du gjort tio set för en muskelgrupp i veckan i ett halvår kan lite mer vara svaret. Om du gjort tjugofem och sover dåligt är svaret troligen det motsatta.

Prova att backa medvetet. En vecka med tydligt lättare vikter och färre set, och därefter en återgång, brukar lösa upp en period av stillastående oftare än att bita ihop och köra hårdare. Det är en väl etablerad praxis bland folk som tränat länge.

Byt övningsvariant om en specifik övning stått still länge. Bänkpress med hantlar, lutande bänk eller ett annat grepp ger ny stimulans utan att du behöver ändra hela upplägget.

## Vanliga misstag

Att öka för fort är det första. Att lägga på fem kilo i veckan i bänkpress fungerar i tre veckor och sedan slutar det fungera, oftast med sämre teknik som följd.

Att öka i alla övningar samtidigt är det andra. Prioritera två eller tre basövningar att driva framåt, och låt resten följa med.

Att inte skriva ner något är det tredje, och det största. Progressiv överbelastning förutsätter att du vet utgångspunkten. Har du bara en känsla av vad du gjorde senast blir ökningen slumpmässig.

## Hur du vet att du gör rätt

Titta över en åttaveckorsperiod. Har vikten eller repetitionerna i dina huvudövningar rört sig uppåt, om än lite? Har du kunnat hålla tekniken? Har du kunnat träna nästan alla planerade pass? Om svaret är ja på de tre är upplägget i grunden rätt, även om enskilda veckor känns trögare.

Allt det bygger på siffror du sparat. [Skapa ett konto](/auth) och logga varje set med vikt och repetitioner, så har du underlaget nästa gång du står och funderar på om du ska öka.
    \`
  },
  {
    slug: 'set-och-reps-for-muskeltillvaxt',
    title: 'Set och reps för muskeltillväxt: hur du lägger upp volymen',
    description: 'Hur många set och repetitioner som är rimligt per muskelgrupp och vecka, och hur du fördelar dem över dina pass.',
    category: 'Styrketräning',
    icon: Layers,
    readTime: '8 min',
    date: '2025-01-22',
    metaDescription: 'Så lägger du upp set och repetitioner för muskeltillväxt: rimlig veckovolym per muskelgrupp, repetitionsintervall och hur du fördelar arbetet över veckan.',
    keywords: ['set och reps', 'muskeltillväxt', 'träningsvolym', 'hypertrofi', 'antal set'],
    content: \`
## Tre saker som styr upplägget

När folk pratar om set och reps blandas oftast tre olika frågor ihop: hur mycket totalt arbete du gör, hur tungt du gör det, och hur ofta. De hänger ihop, men det är lättare att bestämma dem var för sig.

## Repetitionsintervall

Muskeltillväxt sker i ett brett spann av repetitioner, förutsatt att seten tas tillräckligt nära utmattning. Det är en av de tydligare slutsatserna från de senaste årens träningslitteratur, och den har gjort valet av intervall mindre dramatiskt än det brukade framställas.

I praktiken fungerar ungefär så här. Tunga basövningar som knäböj, marklyft och bänkpress passar bra i 5 till 8 repetitioner, dels för att belastningen då blir tillräcklig för styrkan, dels för att högre repetitionsantal i de övningarna blir tekniskt slarviga när tröttheten kommer. Övningar med hantlar, kablar och maskiner passar bättre i 8 till 15, där du kan gå nära utmattning utan att tekniken faller isär. Isolationsövningar som lateral raises, bicepscurl och vadpress fungerar utmärkt i 12 till 20.

Väljer du intervall på det sättet får du bredd över veckan utan att behöva tänka på det.

## Hur många set

Här finns ett spann snarare än ett facit. Ett rimligt utgångsläge för de flesta är omkring 10 till 20 hårda set per muskelgrupp och vecka. Nybörjare får resultat på betydligt mindre än så, ofta 6 till 10 set, och det är ett bättre ställe att börja på än att direkt lägga sig i toppen av spannet.

Med ett hårt set menas ett set som tas nära utmattning, alltså med ungefär noll till tre repetitioner kvar i tanken. Uppvärmningsset räknas inte. Set där du stannar med fem repetitioner i marginal räknas knappt heller.

Räkna med att övningar överlappar. Bänkpress ger arbete åt triceps, rodd ger åt biceps, knäböj ger åt sätesmuskulaturen. Om du gör tolv set bröst i veckan behöver du sällan tio ytterligare för triceps.

## Fördelning över veckan

En muskelgrupp svarar bättre på att arbetet sprids ut än på att allt görs på en gång. Två tillfällen per vecka och muskelgrupp är en bra normalnivå. Tre kan fungera om totalvolymen är hög. Ett tillfälle fungerar också, men då blir passen långa och de sista seten görs i tydlig trötthet.

Ett vanligt och välfungerande sätt att få till två tillfällen per muskelgrupp är att köra ett [push pull ben-split](/blogg/push-pull-ben-tredagarssplit) två gånger på sex dagar, eller ett överkropp och underkropp-upplägg fyra dagar i veckan.

## Ett konkret exempel

Så här kan tolv set bröst i veckan se ut, fördelat på två pass.

Pass ett: bänkpress 4 set om 6 till 8, lutande hantelpress 3 set om 8 till 12.
Pass två: hantelpress 3 set om 8 till 12, kabelflyes 2 set om 12 till 15.

Nio till tolv set, två tillfällen, blandade repetitionsintervall och en tydlig tung basövning först i passet. Samma logik går att applicera på rygg, ben, axlar och armar.

## Vila mellan set

Kort vila spar tid men sänker prestationen i nästa set. På tunga basövningar behöver du ofta två till tre minuter för att kunna göra nästa set på riktigt. På isolationsövningar räcker ofta en till en och en halv minut. Om dina repetitioner rasar kraftigt mellan set ett och set tre är för kort vila den vanligaste orsaken.

## Vanliga misstag

Att lägga till volym som lösning på allt är det första. Om resultaten stannar av är mer set ett rimligt försök, men bara upp till en punkt. Träningsvolym du inte återhämtar dig från gör ingen nytta, den bara tar tid och gör dig trött.

Att räkna set som inte är hårda är det andra. Tjugo set i veckan där inget tas i närheten av utmattning ger mindre än tio set som gör det.

Att byta upplägg för ofta är det tredje. Ett program behöver några månader innan du kan säga något om det. Byter du var tredje vecka har du ingen aning om vad som fungerade.

Att inte veta sin egen volym är det fjärde, och det underskattas. Väldigt få kan svara på hur många set rygg de gjorde förra veckan. Utan den siffran är hela diskussionen om volym teoretisk.

## Hur du vet att det ligger rätt

Du ska kunna genomföra veckans pass utan att känna dig nedkörd, du ska ha någon form av utveckling i vikt eller repetitioner över ett par månader, och muskelömheten ska klinga av innan nästa gång du tränar samma område. Om du är konstant trött, sover sämre och tappar prestation är volymen troligen för hög i förhållande till din återhämtning. Mer om det i [vilodagar och återhämtning](/blogg/vilodagar-och-aterhamtning).

Att hålla reda på set per muskelgrupp och vecka i huvudet går inte i längden. [Skapa ett konto](/auth) och logga passen, så räknas volymen ihop åt dig och du ser direkt om rygg fått hälften så mycket som bröst i tre månader.
    \`
  },
  {
    slug: 'push-pull-ben-tredagarssplit',
    title: 'Push pull ben: så bygger du ett tredagarssplit som håller',
    description: 'Hur ett push pull ben-upplägg är uppbyggt, vilka övningar som hör hemma var, och hur du får ihop det med en vanlig vecka.',
    category: 'Träningsprogram',
    icon: Repeat,
    readTime: '8 min',
    date: '2025-01-29',
    metaDescription: 'Push pull ben förklarat: hur du delar upp passen, vilka övningar som ingår, hur ofta du kör och hur du anpassar splitet till tre eller sex dagar i veckan.',
    keywords: ['push pull ben', 'ppl', 'träningssplit', 'tredagarssplit', 'träningsprogram'],
    content: \`
## Idén bakom splitet

Push pull ben delar upp kroppen efter rörelse i stället för efter muskelgrupp. Ett tryckpass tränar bröst, axlar och triceps, som ändå arbetar tillsammans i alla pressövningar. Ett dragpass tränar rygg, bakre axel och biceps, som arbetar tillsammans i alla drag. Ett benpass tränar underkroppen.

Fördelen är att muskler som redan samarbetar blir trötta samtidigt i stället för på tre olika dagar. Du slipper situationen där du tränar triceps på måndag och sedan ska bänkpressa på tisdag.

## Vad som ingår i varje pass

### Push

En tung horisontell press, oftast bänkpress eller hantelpress. En vertikal press, till exempel militärpress eller hantelpress över huvudet. En andra bröstövning i ett högre repetitionsintervall, gärna lutande. Sidolyft för axlarna. En eller två tricepsövningar.

Fyra till sex övningar räcker. Ett vanligt fel är att lägga in tre bröstpressvarianter som gör i stort sett samma sak.

### Pull

En vertikal dragövning, latsdrag eller pull ups. En horisontell dragövning, skivstångsrodd, hantelrodd eller kabelrodd. En andra ryggövning med annan vinkel. Något för bakre axel, till exempel face pulls. En eller två bicepsövningar.

Marklyft kan ligga antingen här eller på benpasset. Lägg det där du orkar göra det med god teknik, inte där schemat råkar säga.

### Ben

En knädominant övning, knäböj, benpress eller frontböj. En höftdominant övning, rumänsk marklyft, höftlyft eller good mornings. En enbensövning, utfall eller bulgarian split squat. Något för lårets baksida om det inte redan täckts. Vader.

Baksida lår glöms bort systematiskt i benpass som bara innehåller knäböj och benpress. Se till att det finns minst en övning som belastar den.

## Hur ofta du kör

### Tre dagar i veckan

Push på måndag, pull på onsdag, ben på fredag. Varje muskelgrupp tränas en gång i veckan. Det fungerar, framför allt för den som är ny eller har begränsad tid, men det innebär att du behöver få in hela veckans volym för en muskelgrupp i ett pass. Passen blir långa och de sista seten görs trötta.

### Sex dagar i veckan

Push, pull, ben, push, pull, ben, vila. Varje muskelgrupp tränas två gånger på sex dagar, vilket ligger bra i förhållande till hur [set och reps bör fördelas](/blogg/set-och-reps-for-muskeltillvaxt). Det kräver att du faktiskt kan träna sex dagar i veckan under lång tid, vilket färre klarar av än som tror det.

### Fem dagar rullande

Push, pull, ben, vila, push, pull, ben, vila, och så vidare oavsett veckodag. Ger ungefär samma frekvens som sexdagarsvarianten men med mer vila. Nackdelen är att passen hamnar på olika veckodagar hela tiden, vilket är opraktiskt för många.

Om du bara kan träna tre eller fyra dagar i veckan är ett överkropp och underkropp-upplägg ofta ett bättre val än push pull ben, just för att frekvensen blir högre.

## Ett exempel på ett pushpass

Bänkpress, 4 set om 5 till 8.
Militärpress, 3 set om 6 till 10.
Lutande hantelpress, 3 set om 8 till 12.
Sidolyft, 3 set om 12 till 20.
Tricepspress i kabel, 3 set om 10 till 15.

Ungefär sextio till sjuttio minuter med rimliga vilotider. Tung basövning först, isolation sist, och en tydlig ordning så att du inte gör det viktigaste när du redan är slut.

## Hur du gör passen olika

Om du kör push pull ben två gånger i veckan behöver de två passen inte vara identiska. Ett vanligt upplägg är att göra det första passet tyngre, med lägre repetitioner i basövningen, och det andra lättare med mer isolationsarbete. Det sprider belastningen och gör att du inte försöker sätta rekord fyra gånger i veckan.

## Vanliga misstag

Att göra benpasset till ett andrahandspass är det vanligaste. Det är det passet som stryks när veckan blir stressig. Lägg det tidigt i veckan om du vet med dig att du gör så.

Att ha för många övningar är det näst vanligaste. Ett pass med nio övningar innebär att de sista tre görs utan energi och utan progression.

Att inte hålla ordning på vad du gjorde förra gången är det tredje. Med sex olika pass roterande blir det snabbt omöjligt att komma ihåg vilka vikter som gällde i vilket pass.

## Hur du vet att splitet fungerar

Du klarar att genomföra passen som planerat de flesta veckor, du ser en långsam ökning i vikt eller repetitioner i huvudövningarna, och du är inte så trött att träningen börjar konkurrera med resten av livet. Om något av det inte stämmer är det oftast antalet dagar, inte splitet i sig, som behöver justeras.

Ett rullande upplägg med sex olika pass är svårt att hålla i huvudet. [Skapa ett konto](/auth), lägg in ditt push pull ben-program och få förra passets vikter framme när du står vid stången.
    \`
  },
  {
    slug: 'vilodagar-och-aterhamtning',
    title: 'Vilodagar och återhämtning: hur ofta du bör träna',
    description: 'Hur många dagar i veckan som är rimligt att träna, vad återhämtning faktiskt består av och hur du märker att du tagit i för mycket.',
    category: 'Återhämtning',
    icon: Moon,
    readTime: '7 min',
    date: '2025-02-05',
    metaDescription: 'Hur ofta bör du träna och hur många vilodagar behöver du? Om återhämtning, sömn, muskelömhet och tecken på att träningsmängden är för hög.',
    keywords: ['vilodagar', 'återhämtning', 'hur ofta träna', 'överträning', 'muskelömhet'],
    content: \`
## Anpassningen sker mellan passen

Träningen är stimulansen. Anpassningen, alltså det som gör dig starkare, sker under tiden däremellan. Det är en gammal och ganska självklar formulering, men den får konsekvenser som många hoppar över: mer träning är bara bättre så länge du hinner återhämta dig från den.

## Hur många dagar i veckan

För de allra flesta som tränar styrka på egen hand ligger tre till fem pass i veckan bra. Tre dagar räcker gott för att bli tydligt starkare, särskilt de första åren. Fem dagar ger utrymme för mer volym per muskelgrupp men kräver att sömn och mat fungerar.

Sex dagar går, men marginalerna blir små. Ett par dåliga nätter eller en stressig arbetsvecka räcker för att det ska bli för mycket. Sju dagar i veckan med tung träning är svårt att motivera för någon som inte tävlar.

Antalet pass säger dessutom mindre än den totala mängden hårt arbete. Fem korta pass kan vara lättare att återhämta sig från än tre väldigt långa.

## Vad återhämtning består av

### Sömn

Sömn är den enskilt viktigaste faktorn och den som oftast är eftersatt. Om du sover fem timmar per natt spelar det liten roll hur väl programmet är upplagt. Det märks först som att repetitionerna faller på vikter du brukar klara, och därefter som att motivationen försvinner.

### Mat

Tillräckligt med energi och protein över dagen. Under en period av viktnedgång går återhämtningen långsammare och det är rimligt att sänka ambitionen på nya rekord under tiden.

### Belastning i övrigt

Ett fysiskt arbete, långa löprundor eller en period med hög stress konkurrerar om samma återhämtning som styrketräningen. Det är helt normalt att behöva träna mindre under en tung period, och det är inte ett misslyckande.

### Lättare veckor

Efter sex till tio veckors gradvis ökande belastning brukar en vecka med tydligt mindre volym och lättare vikter göra nytta. Många upplever att de kommer tillbaka starkare veckan därpå. Det är etablerad praxis bland folk som tränat länge, och det är enklare att planera in i förväg än att vänta tills man är helt slut.

## Vilodag betyder inte stillasittande

En vilodag från gymmet kan gärna innehålla en promenad, lite lättare rörlighet eller cykling till jobbet. Lätt rörelse verkar för de flesta göra ont gott snarare än att störa återhämtningen. Det som ska undvikas är hårda pass som konkurrerar med det du precis gjort.

## Muskelömhet är ett dåligt mått

Ömhet säger mest om hur ovant något var, inte om hur bra passet var. Du blir öm av en ny övning, av mycket excentriskt arbete eller av att ha varit ledig en period. Efter några veckor med samma program försvinner ömheten även om träningen fortsätter fungera precis lika bra.

Att jaga ömhet leder oftast till att man ständigt byter övningar, vilket gör det omöjligt att följa utvecklingen.

## Tecken på att mängden är för hög

Enstaka sämre pass betyder ingenting. Det som är värt att reagera på är mönster över ett par veckor:

Prestationen faller i flera övningar samtidigt, trots att du försöker.
Sömnen blir sämre trots att du är trött.
Vilopulsen ligger ovanligt högt över flera morgnar.
Motivationen att gå till gymmet försvinner utan annan förklaring.
Leder och senor värker i vardagen, inte bara under passet.

Om flera av de sakerna sammanfaller är det rimligaste svaret att dra ner på volymen i en till två veckor, inte att bita ihop. Det kostar mycket lite i det längre perspektivet.

Vid smärta som håller i sig, är skarp eller påverkar vardagen bör du söka vård i stället för att gissa dig fram. Det ligger utanför vad ett träningsupplägg kan lösa.

## Hur du märker att det ligger rätt

Du orkar genomföra de pass du planerat de flesta veckor. Du är trött efter passen men inte utslagen dagen efter. Vikterna rör sig långsamt uppåt över ett par månader. Du ser fram emot att träna oftare än du inte gör det.

Det där är svårt att bedöma i efterhand utan anteckningar. Loggar du varje pass med vikter och repetitioner ser du direkt om prestationen fallit tre veckor i rad, eller om det bara var ett tungt pass. [Skapa ett konto](/auth) så har du underlaget nästa gång du funderar på om du behöver en lättare vecka.
    \`
  },
  {
    slug: 'rpe-och-rir-styr-intensiteten',
    title: 'RPE och RIR: så styr du intensiteten på ett pass',
    description: 'Vad RPE och RIR betyder, hur du använder skalorna i praktiken och varför de är användbara när dagsformen varierar.',
    category: 'Styrketräning',
    icon: Gauge,
    readTime: '7 min',
    date: '2025-02-12',
    metaDescription: 'RPE och RIR förklarat: vad skalorna betyder, hur du bedömer ett set, hur du använder dem för att styra vikten och vanliga fel när man börjar.',
    keywords: ['rpe', 'rir', 'träningsintensitet', 'reps i reserv', 'ansträngningsgrad'],
    content: \`
## Två sätt att beskriva samma sak

RIR står för reps in reserve, alltså hur många repetitioner du hade kvar när du avslutade setet. RIR 2 betyder att du hade kunnat göra två till med bibehållen teknik.

RPE står för rate of perceived exertion och beskriver hur ansträngande setet var på en skala som i styrketräning oftast går från 6 till 10. RPE 10 betyder att inget mer var möjligt. RPE 8 betyder att två repetitioner fanns kvar.

Skalorna är alltså spegelbilder av varandra. RPE 8 är samma sak som RIR 2, RPE 9 är RIR 1, RPE 10 är RIR 0. Använd den du tycker är enklast att tänka i. Många tycker RIR är mer konkret eftersom man räknar repetitioner i stället för att bedöma en känsla.

## Varför det är användbart

Ett program som säger 3 set om 8 på 80 kilo antar att du har samma dagsform varje vecka. Det har du inte. En dålig natts sömn eller en tung arbetsvecka kan flytta vad du klarar med flera kilo.

Om anvisningen i stället är 3 set om 8 med ungefär två repetitioner kvar, justerar sig belastningen automatiskt. En bra dag blir det 82,5 kilo, en dålig dag 75. Du får rätt ansträngningsnivå i båda fallen, i stället för att antingen missa målet eller köra alldeles för lätt.

Det är också det som gör loggen mycket mer läsbar i efterhand. Att du gjorde 8 repetitioner på 80 kilo säger något. Att du gjorde det med två repetitioner kvar, när du förra månaden gjorde samma sak utan marginal, säger mycket mer.

## Hur du bedömer ett set

Frågan att ställa sig direkt efter sista repetitionen är enkel: hur många fler hade jag klarat, med samma teknik och utan hjälp?

Om svaret är noll är setet RIR 0. Om du är säker på att en till hade gått men inte två är det RIR 1. Om det kändes som att två eller tre fanns kvar är det RIR 2 till 3.

Nybörjare underskattar nästan alltid vad de har kvar. Det är väl dokumenterat att de som är nya i styrketräning tenderar att stanna långt före verklig utmattning och ändå uppleva setet som maximalt. Det är inget konstigt, bedömningen blir bättre med erfarenhet.

Ett sätt att kalibrera sig är att någon gång, i en säker övning som benpress eller en maskin, faktiskt köra tills du inte klarar fler. Då får du en referenspunkt att jämföra mot.

## Var du bör lägga dig

För muskeltillväxt är RIR 0 till 3 ett rimligt spann på de flesta arbetsset. Merparten av seten kan ligga runt RIR 1 till 2. Det är tillräckligt nära utmattning för att räknas som ett hårt set enligt resonemanget i [set och reps för muskeltillväxt](/blogg/set-och-reps-for-muskeltillvaxt), utan att varje pass blir så tungt att du behöver flera dagar för att komma tillbaka.

För ren styrketräning i tunga basövningar hamnar man ofta lite längre från utmattning, RIR 2 till 4, eftersom teknik och nervsystemets belastning väger tyngre än total utmattning.

RIR 0 hör bäst hemma i isolationsövningar och maskiner, där det är säkert att köra slut och där du inte riskerar teknikhaveri under en tung stång.

## Så använder du det över tid

Ett vanligt upplägg är att börja en period lite längre från utmattning och gradvis närma sig den. Vecka ett kan ligga på RIR 3, och sedan minskar marginalen med ungefär en repetition i veckan tills du är på RIR 0 till 1. Därefter en lättare vecka, och sedan om igen från en högre utgångsvikt.

Det kräver att du noterar både vikt, repetitioner och marginal i loggen. Utan den tredje uppgiften går det inte att se om du faktiskt närmade dig utmattning eller bara körde samma sak fyra veckor i rad.

## Vanliga misstag

Att kalla allt RPE 10 är det första. Om varje set i varje pass tas till absolut utmattning blir återhämtningen lidande och volymen faller i de efterföljande seten.

Att bedöma i efterhand är det andra. Skriv ner siffran direkt efter setet, inte när du kommer hem.

Att låta skalan ersätta planeringen är det tredje. RPE och RIR styr belastningen inom passet, men du behöver fortfarande ett upplägg för [progressiv överbelastning](/blogg/progressiv-overbelastning-oka-belastningen) över veckorna.

Att inte skilja på teknisk och verklig utmattning är det fjärde. Repetitioner som bara går igenom med studs och krokig rygg räknas inte in i marginalen.

## Hur du vet att du gör rätt

Din bedömning ska bli mer träffsäker med tiden. Ett tecken på att du är på rätt spår är att du kan förutsäga hur många repetitioner du får på en given vikt innan du gör setet, och sedan hamna nära. Ett annat är att repetitionerna inte rasar dramatiskt mellan första och sista arbetssetet.

Marginalen är en uppgift som är värdelös om den inte sparas. [Skapa ett konto](/auth) och skriv ner vikt, repetitioner och hur nära utmattning varje set låg, så ser du över tid om du faktiskt tränar tyngre eller bara tränar likadant.
    \`
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
