import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { UserPlus, Sparkles, Dumbbell, BarChart3, Trophy, Users } from "lucide-react";

const HowItWorks = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: UserPlus,
      titleKey: "howItWorks.step1.title",
      descriptionKey: "howItWorks.step1.description"
    },
    {
      icon: Sparkles,
      titleKey: "howItWorks.step2.title",
      descriptionKey: "howItWorks.step2.description"
    },
    {
      icon: Dumbbell,
      titleKey: "howItWorks.step3.title",
      descriptionKey: "howItWorks.step3.description"
    },
    {
      icon: BarChart3,
      titleKey: "howItWorks.step4.title",
      descriptionKey: "howItWorks.step4.description"
    },
    {
      icon: Trophy,
      titleKey: "howItWorks.step5.title",
      descriptionKey: "howItWorks.step5.description"
    },
    {
      icon: Users,
      titleKey: "howItWorks.step6.title",
      descriptionKey: "howItWorks.step6.description"
    }
  ];

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
            {t('howItWorks.title')} <span className="text-gradient">{t('howItWorks.titleHighlight')}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('howItWorks.subtitle')}
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
                <h3 className="text-xl font-display font-bold mb-2">{t(step.titleKey)}</h3>
                <p className="text-muted-foreground">{t(step.descriptionKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;