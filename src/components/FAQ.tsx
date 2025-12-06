import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const { t } = useTranslation();

  const faqs = [
    {
      questionKey: "faq.q1.question",
      answerKey: "faq.q1.answer"
    },
    {
      questionKey: "faq.q2.question",
      answerKey: "faq.q2.answer"
    },
    {
      questionKey: "faq.q3.question",
      answerKey: "faq.q3.answer"
    },
    {
      questionKey: "faq.q4.question",
      answerKey: "faq.q4.answer"
    },
    {
      questionKey: "faq.q5.question",
      answerKey: "faq.q5.answer"
    },
    {
      questionKey: "faq.q6.question",
      answerKey: "faq.q6.answer"
    },
  ];

  return (
    <section id="faq" className="py-20 bg-muted/30">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-oswald font-bold mb-4">
            {t('faq.title')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('faq.subtitle')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border">
                <AccordionTrigger className="text-left hover:no-underline hover:text-primary">
                  {t(faq.questionKey)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {t(faq.answerKey)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;