import { motion } from "framer-motion";
import { Brain, BarChart3, Calendar, Target, Smartphone, Users } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Träningsplanerare",
    description: "Få skräddarsydda träningsprogram baserat på dina mål, erfarenhet och tillgänglig utrustning.",
  },
  {
    icon: BarChart3,
    title: "Detaljerad Statistik",
    description: "Visualisera din utveckling med snygga grafer för styrka, volym och prestation över tid.",
  },
  {
    icon: Calendar,
    title: "Smart Schemaläggning",
    description: "Planera dina träningspass och få påminnelser för att hålla dig konsekvent.",
  },
  {
    icon: Target,
    title: "Måluppföljning",
    description: "Sätt upp konkreta mål och följ din progress mot varje delmål och slutmål.",
  },
  {
    icon: Smartphone,
    title: "Mobilapp",
    description: "Ta med dig träningsdagboken överallt med vår användarvänliga app.",
  },
  {
    icon: Users,
    title: "Community",
    description: "Dela din resa, få inspiration och tävla med andra i vår gemenskap.",
  },
];

const Features = () => {
  return (
    <section className="py-24 bg-gym-charcoal relative texture-noise">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            ALLT DU BEHÖVER FÖR ATT <span className="text-gradient">LYCKAS</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Kraftfulla verktyg designade för att ta din träning till nästa nivå.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-card border border-border rounded-lg p-6 hover:border-gym-orange/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gym-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              
              <div className="relative">
                <div className="w-12 h-12 bg-gym-orange/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gym-orange/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-gym-orange" />
                </div>
                
                <h3 className="text-xl font-display font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
