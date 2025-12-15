import { lazy, Suspense, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SocialProofBanner from "@/components/SocialProofBanner";
import AdBanner from "@/components/AdBanner";
import Footer from "@/components/Footer";

// Force module refresh

// Lazy load below-fold components to reduce initial bundle size
const Features = lazy(() => import("@/components/Features"));
const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const TestimonialSection = lazy(() => import("@/components/TestimonialSection"));
const StatisticsShowcase = lazy(() => import("@/components/StatisticsShowcase"));
const SocialShowcase = lazy(() => import("@/components/SocialShowcase"));
const Pricing = lazy(() => import("@/components/Pricing"));
const FAQ = lazy(() => import("@/components/FAQ"));

const LazySection = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div className="min-h-[200px]" />}>
    {children}
  </Suspense>
);

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        <Hero />
        
        {/* Social proof immediately after hero */}
        <SocialProofBanner />
        
        {/* Ad banner after social proof */}
        <div className="container px-4 py-8">
          <AdBanner format="horizontal" />
        </div>
        
        <LazySection>
          <Features />
        </LazySection>
        
        <LazySection>
          <HowItWorks />
        </LazySection>
        
        {/* Ad banner in middle */}
        <div className="container px-4 py-8">
          <AdBanner format="horizontal" />
        </div>
        
        <LazySection>
          <StatisticsShowcase />
        </LazySection>
        
        <LazySection>
          <TestimonialSection />
        </LazySection>
        
        <LazySection>
          <SocialShowcase />
        </LazySection>
        
        <section id="pricing">
          <LazySection>
            <Pricing />
          </LazySection>
        </section>
        
        <LazySection>
          <FAQ />
        </LazySection>
        
        {/* Final ad before footer */}
        <div className="container px-4 py-8">
          <AdBanner format="horizontal" />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
