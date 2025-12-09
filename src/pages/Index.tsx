import { useState } from "react";
import { Hero } from "@/components/Hero";
import { ExamplePrompts } from "@/components/ExamplePrompts";
import { ChatInterface } from "@/components/ChatInterface";
import { ChatHistorySidebar } from "@/components/ChatHistorySidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

const Index = () => {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const handleGetStarted = () => {
    setShowChat(true);
    setSelectedConversationId(null);
    setSelectedPrompt(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectPrompt = (prompt: string) => {
    setSelectedPrompt(prompt);
    setSelectedConversationId(null);
    setShowChat(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setSelectedPrompt(null);
    setSelectedConversationId(null);
    setShowChat(false);
  };

  const handleNewChat = () => {
    setSelectedPrompt(null);
    setSelectedConversationId(null);
  };

  const handleSelectConversation = (id: string | null) => {
    setSelectedConversationId(id);
    setSelectedPrompt(null);
    if (id) {
      setShowChat(true);
    }
  };

  const handleConversationCreated = (id: string) => {
    setSelectedConversationId(id);
  };

  if (showChat) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <ChatHistorySidebar
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
          />
          <main className="flex-1 flex flex-col min-w-0">
            <div className="h-12 flex items-center border-b border-border px-4 md:hidden">
              <SidebarTrigger />
            </div>
            <ChatInterface
              key={selectedConversationId ?? "new"}
              initialPrompt={selectedPrompt ?? undefined}
              conversationId={selectedConversationId}
              onConversationCreated={handleConversationCreated}
              onReset={handleReset}
            />
          </main>
        </div>
      </SidebarProvider>
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
