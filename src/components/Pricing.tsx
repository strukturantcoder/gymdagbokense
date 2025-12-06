import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Check, X, Crown } from "lucide-react";

const Pricing = () => {
  const { t, i18n } = useTranslation();

  const plans = [
    {
      nameKey: "pricing.free.name",
      priceKey: "pricing.free.price",
      descriptionKey: "pricing.free.description",
      features: [
        { textKey: "pricing.free.feature1", included: true },
        { textKey: "pricing.free.feature2", included: true },
        { textKey: "pricing.free.feature3", included: true },
        { textKey: "pricing.free.feature4", included: true },
        { textKey: "pricing.free.feature5", included: false },
        { textKey: "pricing.free.feature6", included: false },
        { textKey: "pricing.free.feature7", included: false },
      ],
      ctaKey: "pricing.free.cta",
      popular: false,
    },
    {
      nameKey: "pricing.premium.name",
      priceKey: "pricing.premium.price",
      descriptionKey: "pricing.premium.description",
      features: [
        { textKey: "pricing.premium.feature1", included: true },
        { textKey: "pricing.premium.feature2", included: true },
        { textKey: "pricing.premium.feature3", included: true },
        { textKey: "pricing.premium.feature4", included: true },
        { textKey: "pricing.premium.feature5", included: true },
        { textKey: "pricing.premium.feature6", included: true },
        { textKey: "pricing.premium.feature7", included: true },
      ],
      ctaKey: "pricing.premium.cta",
      popular: true,
    },
  ];

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
            {t('pricing.title')} <span className="text-gradient">{t('pricing.titleHighlight')}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('pricing.subtitle')}
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
                    {t('pricing.popular')}
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-display font-bold mb-2">{t(plan.nameKey)}</h3>
                <p className="text-muted-foreground text-sm mb-4">{t(plan.descriptionKey)}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-display font-bold">{t(plan.priceKey)}</span>
                  <span className="text-muted-foreground">{t('pricing.perMonth')}</span>
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
                      {t(feature.textKey)}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? "hero" : "outline"}
                size="lg"
                className="w-full"
                asChild
              >
                <Link to="/auth">{t(plan.ctaKey)}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;