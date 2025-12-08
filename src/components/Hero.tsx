import { useState } from "react";
import { ArrowRight, MapPin, Users, Sparkles, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SingpassLoginModal } from "@/components/SingpassLoginModal";
import { useUser } from "@/contexts/UserContext";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isLoggedIn, user } = useUser();

  const handleLoginSuccess = () => {
    // After login, automatically start the journey
    onGetStarted();
  };
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 gradient-hero overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-4xl mx-auto text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium animate-fade-up">
          <MapPin className="w-4 h-4" />
          <span>Your personal guide to Singapore life</span>
        </div>
        
        {/* Main heading */}
        <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight animate-fade-up" style={{ animationDelay: "0.1s" }}>
          Navigate SG Life,{" "}
          <span className="text-gradient">Made Simple</span>
        </h1>
        
        {/* Subheading */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: "0.2s" }}>
          From BTO applications to career changes, get personalised step-by-step checklists 
          for every life situation. No more googling for hours – just ask!
        </p>
        
        {/* CTA Buttons */}
        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: "0.3s" }}>
          {isLoggedIn ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Logged in as {user?.name.split(" ")[0]}
              </div>
              <Button variant="hero" size="xl" onClick={onGetStarted}>
                Start Your Journey
                <ArrowRight className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="xl" 
                onClick={() => setShowLoginModal(true)}
                className="bg-[#CF0024] hover:bg-[#A50020] text-white border-none"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Login with Singpass
              </Button>
              <Button variant="hero" size="xl" onClick={onGetStarted}>
                Continue as Guest
                <ArrowRight className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>
        
        <SingpassLoginModal 
          open={showLoginModal} 
          onOpenChange={setShowLoginModal}
          onSuccess={handleLoginSuccess}
        />
        
        {/* Trust indicators */}
        <div className="pt-8 flex flex-wrap justify-center gap-8 text-muted-foreground animate-fade-up" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm">Built for locals & newcomers</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm">AI-powered guidance</span>
          </div>
        </div>
      </div>
    </section>
  );
};
