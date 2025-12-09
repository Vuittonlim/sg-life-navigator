import { useState, useRef, useEffect } from "react";
import { Send, Loader2, RotateCcw, Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUser, SingpassUserProfile } from "@/contexts/UserContext";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  initialPrompt?: string;
  onReset: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sg-life-guide`;

const formatUserContext = (user: SingpassUserProfile): string => {
  return `
USER PROFILE (from Singpass):
- Name: ${user.name}
- NRIC: ${user.nric}
- Age: ${user.age} years old
- Date of Birth: ${user.dateOfBirth}
- Gender: ${user.gender}
- Race: ${user.race}
- Nationality: ${user.nationality}
- Residential Status: ${user.residentialStatus}
- Marital Status: ${user.maritalStatus}
- Address: ${user.registeredAddress}, Singapore ${user.postalCode}

HOUSING:
- HDB Type: ${user.hdbType}
- HDB Ownership Status: ${user.hdbOwnership}

EMPLOYMENT:
- Status: ${user.employmentStatus}
- Occupation: ${user.occupation}
- Employer: ${user.employer}
- Sector: ${user.employmentSector}
- Monthly Income: S$${user.monthlyIncome.toLocaleString()}

EDUCATION:
- Highest Qualification: ${user.highestEducation}

CPF:
- Contribution History: ${user.cpfContributionHistory}
- Ordinary Account: S$${user.cpfOrdinaryAccount.toLocaleString()}
- Special Account: S$${user.cpfSpecialAccount.toLocaleString()}
- MediSave Account: S$${user.cpfMediSaveAccount.toLocaleString()}

NS STATUS: ${user.nsStatus || "N/A"}
${user.nsMrcDate ? `- MR Cycle Date: ${user.nsMrcDate}` : ""}

VEHICLE: ${user.vehicleOwnership ? user.vehicleDetails : "Does not own a vehicle"}
`.trim();
};

// Parse markdown links and render as clickable
const renderTextWithLinks = (text: string): React.ReactNode[] => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // Add the link
    const [, linkText, url] = match;
    const isOfficial = url.includes("gov.sg") || url.includes("cpf.gov") || url.includes("healthhub");
    const isNews = url.includes("channelnewsasia") || url.includes("straitstimes") || url.includes("todayonline") || url.includes("tnp.sg");
    const isCommunity = url.includes("reddit.com") || url.includes("hardwarezone");
    
    let badgeClass = "source-badge-official";
    if (isNews) badgeClass = "source-badge-news";
    if (isCommunity) badgeClass = "source-badge-community";
    
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`source-link ${badgeClass}`}
      >
        {linkText}
      </a>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
};

// Render bold text
const renderBoldText = (text: string): React.ReactNode[] => {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, j) =>
    j % 2 === 1 ? (
      <strong key={j} className="font-semibold text-foreground">
        {renderTextWithLinks(part)}
      </strong>
    ) : (
      <span key={j}>{renderTextWithLinks(part)}</span>
    )
  );
};

export const ChatInterface = ({ initialPrompt, onReset }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const hasInitialized = useRef(false);
  const { user, isLoggedIn, logout } = useUser();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialPrompt && !hasInitialized.current) {
      hasInitialized.current = true;
      sendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    // Prepare user context if logged in
    const userContext = user ? formatUserContext(user) : null;

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          message: messageText,
          conversationHistory: messages,
          userContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Oops!",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatMessage = (content: string) => {
    return content
      .split("\n")
      .map((line, i) => {
        // Handle numbered lists
        if (/^\d+\.\s/.test(line)) {
          const number = line.match(/^\d+/)?.[0];
          const text = line.replace(/^\d+\.\s/, "");
          return (
            <div key={i} className="flex gap-2 my-1">
              <span className="text-primary font-semibold">{number}.</span>
              <span>{renderBoldText(text)}</span>
            </div>
          );
        }
        // Handle bullet points
        if (/^[-•]\s/.test(line)) {
          const text = line.replace(/^[-•]\s/, "");
          return (
            <div key={i} className="flex gap-2 my-1 ml-4">
              <span className="text-primary">•</span>
              <span>{renderBoldText(text)}</span>
            </div>
          );
        }
        // Handle headings with ###
        if (line.startsWith("### ")) {
          return (
            <h4 key={i} className="font-heading font-semibold text-foreground mt-4 mb-2">
              {renderBoldText(line.replace("### ", ""))}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="font-heading font-bold text-foreground text-lg mt-4 mb-2">
              {renderBoldText(line.replace("## ", ""))}
            </h3>
          );
        }
        // Regular paragraph with links and bold
        return line.trim() ? (
          <p key={i} className="my-1">
            {renderBoldText(line)}
          </p>
        ) : (
          <br key={i} />
        );
      });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center justify-between py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-warm flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-semibold text-foreground">SG Life Guide</span>
          {isLoggedIn && user && (
            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
              {user.name.split(" ")[0]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoggedIn && (
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            New Topic
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                message.role === "user"
                  ? "gradient-warm text-primary-foreground rounded-br-sm"
                  : "bg-card border border-border shadow-soft rounded-bl-sm"
              }`}
            >
              {message.role === "user" ? (
                <p>{message.content}</p>
              ) : (
                <div className="text-foreground leading-relaxed">
                  {formatMessage(message.content)}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start animate-slide-up">
            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-5 py-4 shadow-soft">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching official sources & generating response...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="py-4 border-t border-border">
        <div className="flex gap-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about any life situation in Singapore..."
            className="min-h-[52px] max-h-32 resize-none rounded-xl border-border focus:border-primary"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="h-[52px] w-[52px] rounded-xl shrink-0"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
};
