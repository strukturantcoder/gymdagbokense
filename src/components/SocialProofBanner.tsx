import { motion } from "framer-motion";
import { Users, Dumbbell, Trophy, Star } from "lucide-react";

const stats = [
  { icon: Users, value: "1,000+", label: "Aktiva användare" },
  { icon: Dumbbell, value: "50,000+", label: "Loggade pass" },
  { icon: Trophy, value: "10,000+", label: "Personliga rekord" },
  { icon: Star, value: "4.8/5", label: "Betyg" },
];

export default function SocialProofBanner() {
  return (
    <section className="py-8 bg-secondary/30 border-y border-border/50">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-2xl md:text-3xl font-bold text-foreground">
                {stat.value}
              </span>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
