import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dumbbell, Zap } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden texture-noise">
      {/* Background glow effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-gym-charcoal to-background" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gym-orange/10 blur-[120px] rounded-full" />
      
      <div className="container relative z-10 px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-secondary/50 border border-border px-4 py-2 rounded-full mb-8"
          >
            <Zap className="w-4 h-4 text-gym-orange" />
            <span className="text-sm text-muted-foreground">AI-driven träningsplanering</span>
          </motion.div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold mb-6 leading-none">
            DIN TRÄNING.
            <br />
            <span className="text-gradient">DITT RESULTAT.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-body">
            Skapa skräddarsydda träningsprogram med AI, följ din utveckling med detaljerade grafer 
            och nå dina mål snabbare än någonsin.
          </p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button variant="hero" size="xl" asChild>
              <Link to="/auth">
                <Dumbbell className="w-5 h-5" />
                Kom igång gratis
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <a href="#features">Se hur det fungerar</a>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-3 gap-8 mt-16 pt-16 border-t border-border/50"
          >
            {[
              { value: "10K+", label: "Aktiva användare" },
              { value: "500K+", label: "Loggade pass" },
              { value: "98%", label: "Nöjda kunder" },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-display font-bold text-gradient">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2"
        >
          <div className="w-1 h-2 bg-gym-orange rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
