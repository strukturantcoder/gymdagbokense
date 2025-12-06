import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Brain, BarChart3, Calendar, Target, Smartphone, Users } from "lucide-react";

const Features = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: Brain,
      titleKey: "features.aiPlanner.title",
      descriptionKey: "features.aiPlanner.description",
    },
    {
      icon: BarChart3,
      titleKey: "features.statistics.title",
      descriptionKey: "features.statistics.description",
    },
    {
      icon: Calendar,
      titleKey: "features.scheduling.title",
      descriptionKey: "features.scheduling.description",
    },
    {
      icon: Target,
      titleKey: "features.goals.title",
      descriptionKey: "features.goals.description",
    },
    {
      icon: Smartphone,
      titleKey: "features.mobile.title",
      descriptionKey: "features.mobile.description",
    },
    {
      icon: Users,
      titleKey: "features.community.title",
      descriptionKey: "features.community.description",
    },
  ];

  return (
    <section className="py-24 bg-gym-charcoal relative texture-noise" id="features">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            {t('features.title')} <span className="text-gradient">{t('features.titleHighlight')}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('features.subtitle')}
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
                
                <h3 className="text-xl font-display font-semibold mb-2">{t(feature.titleKey)}</h3>
                <p className="text-muted-foreground text-sm">{t(feature.descriptionKey)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;