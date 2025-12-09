import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    name: "Erik L.",
    role: "Styrkelyftare",
    content: "Äntligen en app som förstår hur jag vill logga mina pass. AI-programmen är otroligt bra anpassade!",
    rating: 5,
  },
  {
    name: "Sofia M.",
    role: "CrossFit-utövare",
    content: "Perfekt för att spåra både WODs och vanlig styrketräning. Älskar att kunna utmana vänner!",
    rating: 5,
  },
  {
    name: "Marcus J.",
    role: "Hobbytränare",
    content: "Som nybörjare var AI-programmen guld värda. Nu har jag loggat över 100 pass!",
    rating: 5,
  },
];

export default function TestimonialSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Vad våra användare säger
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Tusentals träningsentusiaster använder Gymdagboken för att nå sina mål
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <Quote className="w-8 h-8 text-primary/30 mb-4" />
                  <p className="text-foreground mb-4 italic">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
