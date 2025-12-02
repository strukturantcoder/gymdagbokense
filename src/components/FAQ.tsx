import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Är Gymdagboken gratis att använda?",
    answer: "Ja! Grundversionen av Gymdagboken är helt gratis. Du kan logga träningspass, följa din utveckling och använda AI-genererade träningsprogram utan kostnad. Premium-versionen för 19 kr/månad tar bort all reklam."
  },
  {
    question: "Hur fungerar AI-träningsprogrammen?",
    answer: "Vår AI analyserar dina mål, erfarenhetsnivå och tillgängliga träningsdagar för att skapa ett skräddarsytt träningsprogram. Du kan anpassa programmet genom att lägga till/ta bort övningar, ändra ordning och justera sets och reps."
  },
  {
    question: "Kan jag spåra både styrketräning och kondition?",
    answer: "Absolut! Gymdagboken har separata funktioner för styrketräning och konditionsaktiviteter som löpning, simning, cykling och mer. Du får detaljerad statistik för båda typerna."
  },
  {
    question: "Hur fungerar det sociala systemet?",
    answer: "Du kan bjuda in vänner via en unik inbjudningslänk, se varandras statistik och utmana varandra i tävlingar. Tävla om flest träningspass, mest tid eller flest sets under en vald period."
  },
  {
    question: "Fungerar appen offline?",
    answer: "Ja, Gymdagboken är byggd som en PWA (Progressive Web App) vilket betyder att du kan installera den på din telefon och använda grundläggande funktioner även utan internetanslutning."
  },
  {
    question: "Hur installerar jag appen på min telefon?",
    answer: "På Android: Öppna gymdagboken.se i Chrome och tryck på 'Lägg till på startskärmen'. På iPhone: Öppna i Safari, tryck på dela-knappen och välj 'Lägg till på hemskärmen'."
  },
];

const FAQ = () => {
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
            Vanliga frågor
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Har du frågor? Här hittar du svar på de vanligaste frågorna om Gymdagboken.
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
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
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
