import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AdBanner from "@/components/AdBanner";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import StatisticsShowcase from "@/components/StatisticsShowcase";
import SocialShowcase from "@/components/SocialShowcase";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        <Hero />
        
        {/* Ad banner after hero */}
        <div className="container px-4 py-8">
          <AdBanner size="horizontal" />
        </div>
        
        <Features />
        
        <HowItWorks />
        
        {/* Ad banner in middle */}
        <div className="container px-4 py-8">
          <AdBanner size="horizontal" />
        </div>
        
        <StatisticsShowcase />
        
        <SocialShowcase />
        
        <section id="pricing">
          <Pricing />
        </section>
        
        {/* Final ad before footer */}
        <div className="container px-4 py-8">
          <AdBanner size="horizontal" />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
