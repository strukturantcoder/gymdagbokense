import { lazy, Suspense, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AdBanner from "@/components/AdBanner";
import Footer from "@/components/Footer";

// Force module refresh

// Lazy load below-fold components to reduce initial bundle size
const Features = lazy(() => import("@/components/Features"));
const HowItWorks = lazy(() => import("@/components/HowItWorks"));
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Helmet>
        <title>Gymdagboken - Bästa träningsdagboken med AI | Gratis träningsapp</title>
        <meta name="description" content="Sveriges smartaste träningsdagbok med AI-genererade träningsprogram. Logga styrketräning, kondition och CrossFit. Spåra personliga rekord och tävla mot vänner. 100% gratis att börja!" />
        <link rel="canonical" href="https://gymdagboken.se/" />
      </Helmet>
      <Header />
      
      <main>
        <Hero />
        
        {/* Leaderboard ad after social proof */}
        <div className="container px-4 py-8">
          <AdBanner format="leaderboard" placement="landing_leaderboard" />
        </div>
        
        <LazySection>
          <Features />
        </LazySection>
        
        <LazySection>
          <HowItWorks />
        </LazySection>
        
        {/* Square large ad in middle */}
        <div className="container px-4 py-8 flex justify-center">
          <AdBanner format="square_large" placement="landing_square" />
        </div>
        
        <LazySection>
          <StatisticsShowcase />
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
        
        {/* Horizontal ad before footer */}
        <div className="container px-4 py-8">
          <AdBanner format="horizontal" placement="dashboard_bottom" />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
