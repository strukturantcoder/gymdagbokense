import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info } from "lucide-react";

// Exercise database with Swedish descriptions
const exerciseDatabase: Record<string, { description: string; muscles: string; tips: string[] }> = {
  // Chest
  "bänkpress": {
    description: "Ligg på en bänk med fötterna i golvet. Grip stången något bredare än axelbredd. Sänk stången kontrollerat mot bröstet och pressa upp.",
    muscles: "Bröst, triceps, främre axlar",
    tips: ["Håll skulderbladen ihopdragna", "Spänn magen", "Andas in på väg ner, ut på väg upp"]
  },
  "hantelpress": {
    description: "Ligg på en bänk med en hantel i varje hand. Pressa hantlarna rakt upp och sänk kontrollerat.",
    muscles: "Bröst, triceps, främre axlar",
    tips: ["Hantlarna ska mötas längst upp", "Kontrollerad rörelse hela vägen", "Armbågarna i 45-graders vinkel"]
  },
  "flyes": {
    description: "Ligg på en bänk med hantlar. Sänk hantlarna ut åt sidorna med lätt böjda armbågar, sedan tillbaka.",
    muscles: "Bröst (stretch-fokus)",
    tips: ["Håll armbågarna lätt böjda hela tiden", "Känn stretch i bröstet längst ner", "Gå inte för tungt"]
  },
  "cable flyes": {
    description: "Stå mellan två kabeltorn. Dra handtagen framåt och ihop framför kroppen med lätt böjda armar.",
    muscles: "Bröst",
    tips: ["Kontrollerad rörelse", "Squeeze längst fram", "Variera vinkeln för olika delar av bröstet"]
  },
  "incline bänkpress": {
    description: "Samma som bänkpress men med bänken i lutning (30-45 grader) för att fokusera på övre bröstet.",
    muscles: "Övre bröst, främre axlar, triceps",
    tips: ["Sänk stången mot övre bröstet", "Håll ryggen mot bänken"]
  },

  // Back
  "marklyft": {
    description: "Stå med fötterna höftbrett isär. Böj dig ner och grip stången. Lyft genom att sträcka höfter och knän samtidigt.",
    muscles: "Rygg, rumpa, bakre lår, core",
    tips: ["Håll ryggen rak", "Stången nära kroppen", "Driv genom hälarna", "Spänn core"]
  },
  "rodd": {
    description: "Böj överkroppen framåt med rak rygg. Dra vikten mot magen/nedre bröstet.",
    muscles: "Övre rygg, biceps, bakre axlar",
    tips: ["Håll ryggen rak", "Dra armbågarna bakåt", "Squeeze skulderbladen ihop"]
  },
  "hantelrodd": {
    description: "Stöd ena knäet och handen på en bänk. Dra hanteln mot höften med den andra handen.",
    muscles: "Lats, övre rygg, biceps",
    tips: ["Håll ryggen rak och parallell med golvet", "Full stretch längst ner"]
  },
  "latsdrag": {
    description: "Sitt i maskinen och grip stången brett. Dra ner mot bröstet med kontrollerad rörelse.",
    muscles: "Lats, biceps, övre rygg",
    tips: ["Luta dig lätt bakåt", "Dra med armbågarna", "Full stretch längst upp"]
  },
  "pullups": {
    description: "Häng i en stång med handflator framåt. Dra dig upp tills hakan är över stången.",
    muscles: "Lats, biceps, övre rygg",
    tips: ["Engage core", "Kontrollerad nedsänkning", "Full extension längst ner"]
  },
  "chins": {
    description: "Som pullups men med underhandsgrepp (handflator mot dig).",
    muscles: "Lats, biceps",
    tips: ["Mer biceps-aktivering än pullups", "Håll skuldrorna nere"]
  },

  // Shoulders
  "axelpress": {
    description: "Sitt eller stå med vikter vid axlarna. Pressa rakt upp över huvudet.",
    muscles: "Axlar (främst främre), triceps",
    tips: ["Spänn core", "Pressa rakt upp", "Kontrollerad nedsänkning"]
  },
  "sidolyft": {
    description: "Stå med hantlar vid sidorna. Lyft armarna ut åt sidorna till axelhöjd.",
    muscles: "Sidoaxlar",
    tips: ["Lätt böjda armbågar", "Lyft inte högre än axlarna", "Kontrollerad rörelse"]
  },
  "facepull": {
    description: "Dra kabelrepet mot ansiktet med armbågarna högt. Rotera handlederna utåt i slutpositionen.",
    muscles: "Bakre axlar, övre rygg",
    tips: ["Håll armbågarna högt", "Squeeze skulderbladen", "Bra för axelhälsa"]
  },
  "rear delt flyes": {
    description: "Böj framåt och lyft hantlarna ut åt sidorna med lätt böjda armar.",
    muscles: "Bakre axlar",
    tips: ["Håll överkroppen stilla", "Squeeze i toppläget"]
  },

  // Arms
  "bicepscurl": {
    description: "Stå med vikter hängande. Böj armbågarna och curl vikten upp mot axlarna.",
    muscles: "Biceps",
    tips: ["Håll överarmarna stilla", "Kontrollerad rörelse", "Squeeze längst upp"]
  },
  "hammarcurl": {
    description: "Som bicepscurl men med neutral grepp (tummar uppåt).",
    muscles: "Biceps, underarmar",
    tips: ["Bra för underarmsaktivering", "Håll armbågarna nära kroppen"]
  },
  "tricepspress": {
    description: "Ligg på bänk och sänk vikten mot pannan/bakom huvudet, sträck sedan armarna.",
    muscles: "Triceps",
    tips: ["Håll överarmarna stilla", "Kontrollerad rörelse ner"]
  },
  "triceps pushdown": {
    description: "Stå vid kabelmaskin och pressa handtaget nedåt genom att sträcka armbågarna.",
    muscles: "Triceps",
    tips: ["Håll armbågarna nära kroppen", "Full extension längst ner"]
  },
  "dips": {
    description: "Stöd dig på parallella stänger. Sänk kroppen genom att böja armbågarna, pressa sedan upp.",
    muscles: "Triceps, bröst, främre axlar",
    tips: ["Luta framåt för mer bröst", "Håll dig rak för mer triceps"]
  },

  // Legs
  "knäböj": {
    description: "Stå med stången på övre ryggen. Sänk dig genom att böja knän och höfter. Gå djupt och pressa upp.",
    muscles: "Lår, rumpa, core",
    tips: ["Håll ryggen rak", "Knäna följer tårna", "Gå så djupt du kan med god teknik"]
  },
  "benpress": {
    description: "Sitt i maskinen och pressa vikten uppåt genom att sträcka benen.",
    muscles: "Lår, rumpa",
    tips: ["Fötterna axelbrett eller bredare", "Låt inte knäna falla inåt"]
  },
  "utfall": {
    description: "Ta ett långt steg framåt och sänk bakre knät mot golvet. Pressa tillbaka till start.",
    muscles: "Lår, rumpa, balans",
    tips: ["Håll överkroppen upprätt", "Framknät över vristen"]
  },
  "rumänsk marklyft": {
    description: "Stå med vikten och böj framåt från höften med lätt böjda knän. Känn stretch i bakre låren.",
    muscles: "Bakre lår, rumpa, nedre rygg",
    tips: ["Håll ryggen rak", "Vikten nära benen", "Känn stretch i hamstrings"]
  },
  "bencurl": {
    description: "Ligg på mage i maskinen och böj benen för att dra vikten mot rumpan.",
    muscles: "Bakre lår",
    tips: ["Kontrollerad rörelse", "Squeeze längst upp"]
  },
  "bensträck": {
    description: "Sitt i maskinen och sträck benen genom att lyfta vikten.",
    muscles: "Främre lår (quadriceps)",
    tips: ["Full extension längst upp", "Kontrollerad nedsänkning"]
  },
  "vadpress": {
    description: "Stå med tårna på en kant och pressa upp på tårna, sänk sedan hälarna.",
    muscles: "Vader",
    tips: ["Full stretch längst ner", "Pause längst upp"]
  },

  // Core
  "plankan": {
    description: "Håll kroppen rak i en push-up position, stöd på underarmarna.",
    muscles: "Core, axlar",
    tips: ["Håll kroppen rak som en planka", "Spänn magen", "Andas normalt"]
  },
  "situps": {
    description: "Ligg på rygg med böjda knän. Lyft överkroppen mot knäna.",
    muscles: "Mage (rectus abdominis)",
    tips: ["Undvik att dra i nacken", "Kontrollerad rörelse"]
  },
  "cable crunches": {
    description: "Knäböj framför kabelmaskin och crunch nedåt genom att böja magen.",
    muscles: "Mage",
    tips: ["Runda ryggen", "Dra med magen, inte armarna"]
  },
  "hanging leg raises": {
    description: "Häng i en stång och lyft benen rakt upp framför dig.",
    muscles: "Nedre mage, höftböjare",
    tips: ["Kontrollerad rörelse", "Undvik att svinga"]
  }
};

// Function to find exercise info (case-insensitive, partial match)
const findExerciseInfo = (exerciseName: string) => {
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

  if (!info) {
    return <>{children}</>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-left flex items-center gap-1 group hover:text-gym-orange transition-colors cursor-pointer">
          {children}
          <Info className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gym-orange opacity-60" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gym-orange">
            {exerciseName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-1">Hur gör man?</h4>
            <p className="text-sm">{info.description}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-1">Muskler som tränas</h4>
            <p className="text-sm text-gym-orange">{info.muscles}</p>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-1">Tips</h4>
            <ul className="text-sm space-y-1">
              {info.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gym-orange">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseInfo;
