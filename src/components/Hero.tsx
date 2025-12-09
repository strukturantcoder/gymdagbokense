import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dumbbell, Zap, Sparkles, Send, ArrowRight, Check } from "lucide-react";

const examplePrompts = [
  "Skapa ett styrkeprogram för muskelbyggnad, 4 dagar/vecka",
  "Generera en 10-veckors löpplan för mitt första halvmaraton",
  "Ge mig ett HIIT-pass på 20 minuter utan utrustning",
  "Jag vill träna bröst och rygg, föreslå övningar",
];

const Hero = () => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showResponse, setShowResponse] = useState(false);

  const handlePromptClick = (prompt: string) => {
    setInputValue("");
    setIsTyping(true);
    setShowResponse(false);
    
    // Typewriter effect
    let i = 0;
    const typeInterval = setInterval(() => {
      setInputValue(prompt.slice(0, i + 1));
      i++;
      if (i >= prompt.length) {
        clearInterval(typeInterval);
        setIsTyping(false);
        // Show AI response after a brief pause
        setTimeout(() => setShowResponse(true), 500);
      }
    }, 30);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gym-charcoal via-background to-background" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gym-orange/8 blur-[150px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />
      
      <div className="container relative z-10 px-4 py-12 md:py-20">
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-gym-orange/20 to-primary/10 border border-gym-orange/30 px-4 py-2 rounded-full mb-6"
          >
            <Sparkles className="w-4 h-4 text-gym-orange" />
            <span className="text-sm font-medium text-foreground/80">AI-driven träningsplanering</span>
          </motion.div>

          {/* Main headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-4 leading-[1.1]"
          >
            Beskriv ditt mål.
            <br />
            <span className="text-gradient">AI:n skapar din plan.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            Gymdagboken använder AI för att skapa personliga träningsprogram, konditionsplaner och CrossFit-pass anpassade efter just dina mål och förutsättningar.
          </motion.p>

          {/* AI Chat Demo */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-3xl mx-auto mb-8"
          >
            {/* Chat container */}
            <div className="relative bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden">
              {/* Glow effect */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-gym-orange/20 via-transparent to-primary/20 rounded-2xl blur-sm" />
              
              <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl p-1">
                {/* Chat header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">Gymdagboken AI</span>
                </div>

                {/* Chat content */}
                <div className="min-h-[200px] p-4 space-y-4">
                  <AnimatePresence mode="wait">
                    {inputValue && (
                      <motion.div
                        key="user-message"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex justify-end"
                      >
                        <div className="bg-gym-orange text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-[85%] text-left text-sm">
                          {inputValue}
                          {isTyping && <span className="inline-block w-0.5 h-4 bg-white/80 ml-0.5 animate-pulse" />}
                        </div>
                      </motion.div>
                    )}
                    
                    {showResponse && (
                      <motion.div
                        key="ai-response"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="bg-secondary/80 px-4 py-3 rounded-2xl rounded-bl-md max-w-[90%] text-left">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gym-orange to-primary flex items-center justify-center">
                              <Sparkles className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-medium text-gym-orange">Gymdagboken AI</span>
                          </div>
                          <p className="text-sm text-foreground/90 leading-relaxed">
                            Perfekt! Jag skapar ett personanpassat program åt dig baserat på dina mål. 
                            Du får ett komplett schema med övningar, set, reps och viloperioder...
                          </p>
                          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/30">
                            <Check className="w-4 h-4 text-green-500" />
                            <span className="text-xs text-muted-foreground">Redo att generera ditt program</span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {!inputValue && (
                      <motion.div
                        key="placeholder"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center h-[160px] text-center"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gym-orange/20 to-primary/10 flex items-center justify-center mb-3">
                          <Sparkles className="w-6 h-6 text-gym-orange" />
                        </div>
                        <p className="text-muted-foreground text-sm">Klicka på ett exempel nedan för att se hur det fungerar</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Input area */}
                <div className="p-3 border-t border-border/30">
                  <div className="flex items-center gap-2 bg-background/60 rounded-xl px-4 py-3 border border-border/30">
                    <input
                      type="text"
                      placeholder="Beskriv din drömträning..."
                      value={inputValue}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-gym-orange hover:bg-gym-orange/10">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Example prompts */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {examplePrompts.map((prompt, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  onClick={() => handlePromptClick(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary border border-border/50 hover:border-gym-orange/30 text-muted-foreground hover:text-foreground transition-all duration-200"
                >
                  {prompt.length > 40 ? prompt.slice(0, 40) + '...' : prompt}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center"
          >
            <Button variant="hero" size="xl" asChild className="group">
              <Link to="/auth">
                Kom igång gratis
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="#how-it-works" className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                Se hur det fungerar
              </a>
            </Button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-10 flex flex-col items-center gap-2"
          >
            <div className="flex -space-x-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-gym-orange/80 to-primary/60 border-2 border-background flex items-center justify-center text-[10px] font-bold text-white"
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Tusentals användare har redan skapat sina träningsprogram
            </p>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-5 h-8 border-2 border-muted-foreground/20 rounded-full flex justify-center pt-1.5"
        >
          <div className="w-1 h-1.5 bg-gym-orange rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
