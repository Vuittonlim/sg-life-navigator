import { useState } from "react";
import { Hero } from "@/components/Hero";
import { ExamplePrompts } from "@/components/ExamplePrompts";
import { ChatInterface } from "@/components/ChatInterface";

const Index = () => {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  const handleGetStarted = () => {
    setShowChat(true);
    // Scroll to chat section
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectPrompt = (prompt: string) => {
    setSelectedPrompt(prompt);
    setShowChat(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setSelectedPrompt(null);
    setShowChat(false);
  };

  if (showChat) {
    return (
      <main className="min-h-screen bg-background">
        <ChatInterface 
          initialPrompt={selectedPrompt ?? undefined} 
          onReset={handleReset} 
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Hero onGetStarted={handleGetStarted} />
      <ExamplePrompts onSelectPrompt={handleSelectPrompt} />
      
      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            SG Life Guide provides general guidance. For official information, please verify with government agencies.
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Index;
