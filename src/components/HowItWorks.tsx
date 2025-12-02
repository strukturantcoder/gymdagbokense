import { motion } from "framer-motion";
import { UserPlus, Sparkles, Dumbbell, BarChart3, Trophy, Users } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "1. Skapa konto",
    description: "Registrera dig gratis på några sekunder. Du behöver bara en e-postadress för att komma igång."
  },
  {
    icon: Sparkles,
    title: "2. Generera program",
    description: "Berätta om dina mål, erfarenhetsnivå och hur ofta du vill träna. Vår AI skapar ett skräddarsytt program åt dig."
  },
  {
    icon: Dumbbell,
    title: "3. Träna och logga",
    description: "Följ ditt program och logga varje pass. Appen kommer ihåg dina vikter och föreslår progression."
  },
  {
    icon: BarChart3,
    title: "4. Följ din utveckling",
    description: "Se din framgång med detaljerade grafer och statistik. Fira personbästa med konfetti!"
  },
  {
    icon: Trophy,
    title: "5. Sätt mål",
    description: "Sätt personliga mål för varje övning. Få notis när du slår dem och tjäna XP."
  },
  {
    icon: Users,
    title: "6. Tävla med vänner",
    description: "Bjud in vänner, utmana dem på tävlingar och se vem som tränar hårdast!"
  }
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-secondary/30">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            SÅ <span className="text-gradient">FUNGERAR DET</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Kom igång med Gymdagboken i sex enkla steg
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="bg-card border border-border rounded-xl p-6 h-full hover:border-primary/50 transition-colors">
                <div className="w-14 h-14 bg-gradient-to-br from-gym-orange to-gym-amber rounded-xl flex items-center justify-center mb-4">
                  <step.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-display font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;