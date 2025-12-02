import { motion } from "framer-motion";
import { TrendingUp, Flame, Trophy, Calendar } from "lucide-react";

const AppPreview = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gym-orange/5 blur-[150px] rounded-full" />

      <div className="container px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            SE DIN <span className="text-gradient">UTVECKLING</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Kraftfulla visualiseringar som hjälper dig förstå och optimera din träning.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Mock Dashboard */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-xl p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-lg">Välkommen tillbaka, Erik!</h3>
                <p className="text-muted-foreground text-sm">Vecka 47 • November 2024</p>
              </div>
              <div className="flex items-center gap-2 bg-gym-orange/10 px-3 py-1 rounded-full">
                <Flame className="w-4 h-4 text-gym-orange" />
                <span className="text-sm font-medium text-gym-orange">12 dagars streak!</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Pass denna vecka", value: "4", icon: Calendar },
                { label: "Total volym", value: "12.4t", icon: TrendingUp },
                { label: "Personliga rekord", value: "3", icon: Trophy },
              ].map((stat, index) => (
                <div
                  key={index}
                  className="bg-secondary/50 rounded-lg p-4 text-center"
                >
                  <stat.icon className="w-5 h-5 text-gym-orange mx-auto mb-2" />
                  <div className="text-2xl font-display font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Chart Placeholder */}
            <div className="bg-secondary/30 rounded-lg p-4 h-48 relative overflow-hidden">
              <div className="text-sm text-muted-foreground mb-2">Bänkpress utveckling</div>
              
              {/* Fake chart bars */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end gap-2 h-28">
                {[60, 45, 75, 55, 80, 65, 90, 70, 95, 85, 100, 90].map((height, index) => (
                  <motion.div
                    key={index}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${height}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="flex-1 bg-gradient-to-t from-gym-orange to-gym-amber rounded-t"
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Features list */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {[
              {
                title: "Realtidsstatistik",
                description: "Se din utveckling uppdateras direkt efter varje avslutat pass.",
              },
              {
                title: "Trendanalyser",
                description: "Identifiera mönster och förstå vad som fungerar för just dig.",
              },
              {
                title: "Personliga rekord",
                description: "Automatisk spårning av alla dina PRs med celebrationer när du slår dem.",
              },
              {
                title: "Exportera data",
                description: "Ladda ner din träningshistorik i CSV eller PDF för djupare analys.",
              },
            ].map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className="w-2 h-2 bg-gym-orange rounded-full mt-2 flex-shrink-0" />
                <div>
                  <h4 className="font-display font-semibold mb-1">{feature.title}</h4>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AppPreview;
