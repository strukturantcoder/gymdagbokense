import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, Crown } from "lucide-react";

const plans = [
  {
    name: "Gratis",
    price: "0",
    description: "Perfekt för att komma igång",
    features: [
      { text: "Grundläggande träningslogg", included: true },
      { text: "AI-genererade program (3/mån)", included: true },
      { text: "Enkel statistik", included: true },
      { text: "Mobilapp", included: true },
      { text: "Reklam visas", included: false },
      { text: "Avancerade grafer", included: false },
      { text: "Export av data", included: false },
    ],
    cta: "Skapa konto",
    popular: false,
  },
  {
    name: "Premium",
    price: "19",
    description: "För den seriösa atleten",
    features: [
      { text: "Obegränsad träningslogg", included: true },
      { text: "Obegränsade AI-program", included: true },
      { text: "Avancerad statistik & grafer", included: true },
      { text: "Mobilapp utan reklam", included: true },
      { text: "Ingen reklam", included: true },
      { text: "Export av all data", included: true },
      { text: "Prioriterad support", included: true },
    ],
    cta: "Bli Premium",
    popular: true,
  },
];

const Pricing = () => {
  return (
    <section className="py-24 bg-background relative">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            ENKLA <span className="text-gradient">PRISER</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Börja gratis och uppgradera när du är redo att ta bort reklamen och låsa upp alla funktioner.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className={`relative rounded-xl p-8 ${
                plan.popular
                  ? "bg-gradient-to-b from-gym-orange/20 to-card border-2 border-gym-orange"
                  : "bg-card border border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-gym-orange to-gym-amber text-primary-foreground px-4 py-1 rounded-full text-sm font-display flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    POPULÄRAST
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-display font-bold mb-2">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-display font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">kr/mån</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-gym-orange flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
                    )}
                    <span className={feature.included ? "text-foreground" : "text-muted-foreground/50"}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? "hero" : "outline"}
                size="lg"
                className="w-full"
              >
                {plan.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
