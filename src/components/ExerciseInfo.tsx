import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, ExternalLink, Play, Search } from "lucide-react";

interface ExerciseData {
  description: string;
  muscles: string;
  tips: string[];
  videoUrl?: string;
}

// Helper to extract YouTube video ID from URL
const getYouTubeVideoId = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

// Exercise database with Swedish descriptions
const exerciseDatabase: Record<string, ExerciseData> = {
  // Chest
  "bänkpress": {
    description: "Ligg på en bänk med fötterna i golvet. Grip stången något bredare än axelbredd. Sänk stången kontrollerat mot bröstet och pressa upp.",
    muscles: "Bröst, triceps, främre axlar",
    tips: ["Håll skulderbladen ihopdragna", "Spänn magen", "Andas in på väg ner, ut på väg upp"],
    videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg"
  },
  "hantelpress": {
    description: "Ligg på en bänk med en hantel i varje hand. Pressa hantlarna rakt upp och sänk kontrollerat.",
    muscles: "Bröst, triceps, främre axlar",
    tips: ["Hantlarna ska mötas längst upp", "Kontrollerad rörelse hela vägen", "Armbågarna i 45-graders vinkel"],
    videoUrl: "https://www.youtube.com/watch?v=VmB1G1K7v94"
  },
  "flyes": {
    description: "Ligg på en bänk med hantlar. Sänk hantlarna ut åt sidorna med lätt böjda armbågar, sedan tillbaka.",
    muscles: "Bröst (stretch-fokus)",
    tips: ["Håll armbågarna lätt böjda hela tiden", "Känn stretch i bröstet längst ner", "Gå inte för tungt"],
    videoUrl: "https://www.youtube.com/watch?v=eozdVDA78K0"
  },
  "cable flyes": {
    description: "Stå mellan två kabeltorn. Dra handtagen framåt och ihop framför kroppen med lätt böjda armar.",
    muscles: "Bröst",
    tips: ["Kontrollerad rörelse", "Squeeze längst fram", "Variera vinkeln för olika delar av bröstet"],
    videoUrl: "https://www.youtube.com/watch?v=Iwe6AmxVf7o"
  },
  "incline bänkpress": {
    description: "Samma som bänkpress men med bänken i lutning (30-45 grader) för att fokusera på övre bröstet.",
    muscles: "Övre bröst, främre axlar, triceps",
    tips: ["Sänk stången mot övre bröstet", "Håll ryggen mot bänken"],
    videoUrl: "https://www.youtube.com/watch?v=SrqOu55lrYU"
  },

  // Back
  "marklyft": {
    description: "Stå med fötterna höftbrett isär. Böj dig ner och grip stången. Lyft genom att sträcka höfter och knän samtidigt.",
    muscles: "Rygg, rumpa, bakre lår, core",
    tips: ["Håll ryggen rak", "Stången nära kroppen", "Driv genom hälarna", "Spänn core"],
    videoUrl: "https://www.youtube.com/watch?v=op9kVnSso6Q"
  },
  "rodd": {
    description: "Böj överkroppen framåt med rak rygg. Dra vikten mot magen/nedre bröstet.",
    muscles: "Övre rygg, biceps, bakre axlar",
    tips: ["Håll ryggen rak", "Dra armbågarna bakåt", "Squeeze skulderbladen ihop"],
    videoUrl: "https://www.youtube.com/watch?v=kBWAon7ItDw"
  },
  "hantelrodd": {
    description: "Stöd ena knäet och handen på en bänk. Dra hanteln mot höften med den andra handen.",
    muscles: "Lats, övre rygg, biceps",
    tips: ["Håll ryggen rak och parallell med golvet", "Full stretch längst ner"],
    videoUrl: "https://www.youtube.com/watch?v=pYcpY20QaE8"
  },
  "latsdrag": {
    description: "Sitt i maskinen och grip stången brett. Dra ner mot bröstet med kontrollerad rörelse.",
    muscles: "Lats, biceps, övre rygg",
    tips: ["Luta dig lätt bakåt", "Dra med armbågarna", "Full stretch längst upp"],
    videoUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc"
  },
  "pullups": {
    description: "Häng i en stång med handflator framåt. Dra dig upp tills hakan är över stången.",
    muscles: "Lats, biceps, övre rygg",
    tips: ["Engage core", "Kontrollerad nedsänkning", "Full extension längst ner"],
    videoUrl: "https://www.youtube.com/watch?v=eGo4IYlbE5g"
  },
  "chins": {
    description: "Som pullups men med underhandsgrepp (handflator mot dig).",
    muscles: "Lats, biceps",
    tips: ["Mer biceps-aktivering än pullups", "Håll skuldrorna nere"],
    videoUrl: "https://www.youtube.com/watch?v=brhRXlOhWAM"
  },

  // Shoulders
  "axelpress": {
    description: "Sitt eller stå med vikter vid axlarna. Pressa rakt upp över huvudet.",
    muscles: "Axlar (främst främre), triceps",
    tips: ["Spänn core", "Pressa rakt upp", "Kontrollerad nedsänkning"],
    videoUrl: "https://www.youtube.com/watch?v=qEwKCR5JCog"
  },
  "sidolyft": {
    description: "Stå med hantlar vid sidorna. Lyft armarna ut åt sidorna till axelhöjd.",
    muscles: "Sidoaxlar",
    tips: ["Lätt böjda armbågar", "Lyft inte högre än axlarna", "Kontrollerad rörelse"],
    videoUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo"
  },
  "facepull": {
    description: "Dra kabelrepet mot ansiktet med armbågarna högt. Rotera handlederna utåt i slutpositionen.",
    muscles: "Bakre axlar, övre rygg",
    tips: ["Håll armbågarna högt", "Squeeze skulderbladen", "Bra för axelhälsa"],
    videoUrl: "https://www.youtube.com/watch?v=rep-qVOkqgk"
  },
  "rear delt flyes": {
    description: "Böj framåt och lyft hantlarna ut åt sidorna med lätt böjda armar.",
    muscles: "Bakre axlar",
    tips: ["Håll överkroppen stilla", "Squeeze i toppläget"],
    videoUrl: "https://www.youtube.com/watch?v=EA7u4Q_8HQ0"
  },

  // Arms
  "bicepscurl": {
    description: "Stå med vikter hängande. Böj armbågarna och curl vikten upp mot axlarna.",
    muscles: "Biceps",
    tips: ["Håll överarmarna stilla", "Kontrollerad rörelse", "Squeeze längst upp"],
    videoUrl: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo"
  },
  "hammarcurl": {
    description: "Som bicepscurl men med neutral grepp (tummar uppåt).",
    muscles: "Biceps, underarmar",
    tips: ["Bra för underarmsaktivering", "Håll armbågarna nära kroppen"],
    videoUrl: "https://www.youtube.com/watch?v=zC3nLlEvin4"
  },
  "tricepspress": {
    description: "Ligg på bänk och sänk vikten mot pannan/bakom huvudet, sträck sedan armarna.",
    muscles: "Triceps",
    tips: ["Håll överarmarna stilla", "Kontrollerad rörelse ner"],
    videoUrl: "https://www.youtube.com/watch?v=d_KZxkY_0cM"
  },
  "triceps pushdown": {
    description: "Stå vid kabelmaskin och pressa handtaget nedåt genom att sträcka armbågarna.",
    muscles: "Triceps",
    tips: ["Håll armbågarna nära kroppen", "Full extension längst ner"],
    videoUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU"
  },
  "dips": {
    description: "Stöd dig på parallella stänger. Sänk kroppen genom att böja armbågarna, pressa sedan upp.",
    muscles: "Triceps, bröst, främre axlar",
    tips: ["Luta framåt för mer bröst", "Håll dig rak för mer triceps"],
    videoUrl: "https://www.youtube.com/watch?v=2z8JmcrW-As"
  },

  // Legs
  "knäböj": {
    description: "Stå med stången på övre ryggen. Sänk dig genom att böja knän och höfter. Gå djupt och pressa upp.",
    muscles: "Lår, rumpa, core",
    tips: ["Håll ryggen rak", "Knäna följer tårna", "Gå så djupt du kan med god teknik"],
    videoUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8"
  },
  "benpress": {
    description: "Sitt i maskinen och pressa vikten uppåt genom att sträcka benen.",
    muscles: "Lår, rumpa",
    tips: ["Fötterna axelbrett eller bredare", "Låt inte knäna falla inåt"],
    videoUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ"
  },
  "utfall": {
    description: "Ta ett långt steg framåt och sänk bakre knät mot golvet. Pressa tillbaka till start.",
    muscles: "Lår, rumpa, balans",
    tips: ["Håll överkroppen upprätt", "Framknät över vristen"],
    videoUrl: "https://www.youtube.com/watch?v=QOVaHwm-Q6U"
  },
  "rumänsk marklyft": {
    description: "Stå med vikten och böj framåt från höften med lätt böjda knän. Känn stretch i bakre låren.",
    muscles: "Bakre lår, rumpa, nedre rygg",
    tips: ["Håll ryggen rak", "Vikten nära benen", "Känn stretch i hamstrings"],
    videoUrl: "https://www.youtube.com/watch?v=JCXUYuzwNrM"
  },
  "bencurl": {
    description: "Ligg på mage i maskinen och böj benen för att dra vikten mot rumpan.",
    muscles: "Bakre lår",
    tips: ["Kontrollerad rörelse", "Squeeze längst upp"],
    videoUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs"
  },
  "bensträck": {
    description: "Sitt i maskinen och sträck benen genom att lyfta vikten.",
    muscles: "Främre lår (quadriceps)",
    tips: ["Full extension längst upp", "Kontrollerad nedsänkning"],
    videoUrl: "https://www.youtube.com/watch?v=YyvSfVjQeL0"
  },
  "vadpress": {
    description: "Stå med tårna på en kant och pressa upp på tårna, sänk sedan hälarna.",
    muscles: "Vader",
    tips: ["Full stretch längst ner", "Pause längst upp"],
    videoUrl: "https://www.youtube.com/watch?v=gwLzBJYoWlI"
  },

  // Core
  "plankan": {
    description: "Håll kroppen rak i en push-up position, stöd på underarmarna.",
    muscles: "Core, axlar",
    tips: ["Håll kroppen rak som en planka", "Spänn magen", "Andas normalt"],
    videoUrl: "https://www.youtube.com/watch?v=ASdvN_XEl_c"
  },
  "situps": {
    description: "Ligg på rygg med böjda knän. Lyft överkroppen mot knäna.",
    muscles: "Mage (rectus abdominis)",
    tips: ["Undvik att dra i nacken", "Kontrollerad rörelse"],
    videoUrl: "https://www.youtube.com/watch?v=1fbU_MkV7NE"
  },
  "cable crunches": {
    description: "Knäböj framför kabelmaskin och crunch nedåt genom att böja magen.",
    muscles: "Mage",
    tips: ["Runda ryggen", "Dra med magen, inte armarna"],
    videoUrl: "https://www.youtube.com/watch?v=AV5PmrIEooU"
  },
  "hanging leg raises": {
    description: "Häng i en stång och lyft benen rakt upp framför dig.",
    muscles: "Nedre mage, höftböjare",
    tips: ["Kontrollerad rörelse", "Undvik att svinga"],
    videoUrl: "https://www.youtube.com/watch?v=hdng3Nm1x_E"
  }
};

// Function to find exercise info (case-insensitive, partial match)
const findExerciseInfo = (exerciseName: string): ExerciseData | null => {
  const normalizedName = exerciseName.toLowerCase().trim();
  
  // Direct match
  if (exerciseDatabase[normalizedName]) {
    return exerciseDatabase[normalizedName];
  }
  
  // Partial match
  for (const [key, value] of Object.entries(exerciseDatabase)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return value;
    }
  }
  
  return null;
};

interface ExerciseInfoProps {
  exerciseName: string;
  children: React.ReactNode;
}

const ExerciseInfo = ({ exerciseName, children }: ExerciseInfoProps) => {
  const [open, setOpen] = useState(false);
  const info = findExerciseInfo(exerciseName);

  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' teknik övning')}`;

  const videoId = info?.videoUrl ? getYouTubeVideoId(info.videoUrl) : null;
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-left flex items-center gap-1 group hover:text-primary transition-colors cursor-pointer">
          {children}
          <Info className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary opacity-60" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            {exerciseName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Video thumbnail / YouTube link */}
          {info?.videoUrl && thumbnailUrl ? (
            <a 
              href={info.videoUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block relative group/thumb rounded-lg overflow-hidden"
            >
              <img 
                src={thumbnailUrl} 
                alt={`${exerciseName} instruktionsvideo`}
                className="w-full aspect-video object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover/thumb:bg-black/40 transition-colors">
                <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                  <Play className="w-7 h-7 text-white fill-white ml-0.5" />
                </div>
              </div>
            </a>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2"
              asChild
            >
              <a href={youtubeSearchUrl} target="_blank" rel="noopener noreferrer">
                <Search className="w-4 h-4" />
                Sök instruktionsvideo på YouTube
                <ExternalLink className="w-3 h-3 ml-auto" />
              </a>
            </Button>
          )}

          {info ? (
            <>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Hur gör man?</h4>
                <p className="text-sm">{info.description}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Muskler som tränas</h4>
                <p className="text-sm text-primary">{info.muscles}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Tips</h4>
                <ul className="text-sm space-y-1">
                  {info.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              {info.videoUrl && (
                <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                  <a href={info.videoUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3" />
                    Öppna video i YouTube
                  </a>
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vi har inte instruktioner för denna övning ännu. Klicka på länken ovan för att hitta en instruktionsvideo.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseInfo;
