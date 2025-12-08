import { Baby, Briefcase, Home, GraduationCap, Heart, Car } from "lucide-react";

interface ExamplePromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const examples = [
  {
    icon: Baby,
    title: "New Parent",
    prompt: "I just had a baby in Singapore. What government benefits can I claim and what should I register for?",
    color: "text-pink-500",
    bgColor: "bg-pink-50",
  },
  {
    icon: Briefcase,
    title: "Career Switch",
    prompt: "I want to change career from F&B to tech. What courses and support are available?",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    icon: Home,
    title: "First-time Renter",
    prompt: "I just rented a room in Singapore. What should I watch out for and what are my rights as a tenant?",
    color: "text-green-500",
    bgColor: "bg-green-50",
  },
  {
    icon: GraduationCap,
    title: "Primary School",
    prompt: "My child is turning 6 next year. How do I register them for Primary 1?",
    color: "text-purple-500",
    bgColor: "bg-purple-50",
  },
  {
    icon: Heart,
    title: "Getting Married",
    prompt: "I'm planning to get married in Singapore. What's the process and what benefits are available for newlyweds?",
    color: "text-red-400",
    bgColor: "bg-red-50",
  },
  {
    icon: Car,
    title: "Buying a Car",
    prompt: "I want to buy my first car in Singapore. Walk me through COE, loans, and the full process.",
    color: "text-amber-500",
    bgColor: "bg-amber-50",
  },
];

export const ExamplePrompts = ({ onSelectPrompt }: ExamplePromptsProps) => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="font-heading text-2xl font-semibold text-foreground text-center mb-2">
          What can I help you with?
        </h2>
        <p className="text-muted-foreground text-center mb-8">
          Click on a topic or type your own question below
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {examples.map((example) => (
            <button
              key={example.title}
              onClick={() => onSelectPrompt(example.prompt)}
              className="group p-5 rounded-xl border border-border bg-card hover:shadow-soft transition-all duration-200 text-left hover:border-primary/30"
            >
              <div className={`w-10 h-10 rounded-lg ${example.bgColor} flex items-center justify-center mb-3`}>
                <example.icon className={`w-5 h-5 ${example.color}`} />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {example.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {example.prompt}
              </p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
