import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { AboutSection } from "@/components/AboutSection";
import { ModulesSection } from "@/components/ModulesSection";
import { ConclusionSection } from "@/components/ConclusionSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero />
      <AboutSection />
      <ModulesSection />
      <ConclusionSection />
      <Footer />
    </div>
  );
};

export default Index;
