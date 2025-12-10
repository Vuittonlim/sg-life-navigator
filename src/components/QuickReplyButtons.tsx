import { Button } from "@/components/ui/button";

interface QuickReplyOption {
  label: string;
  value: string;
  description?: string;
}

interface QuickReplyButtonsProps {
  question: string;
  options: QuickReplyOption[];
  onSelect: (value: string, label: string) => void;
  disabled?: boolean;
}

export const QuickReplyButtons = ({
  question,
  options,
  onSelect,
  disabled = false,
}: QuickReplyButtonsProps) => {
  return (
    <div className="space-y-3 mt-4 mb-2 animate-slide-up">
      <p className="text-sm text-muted-foreground font-medium">{question}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            variant="outline"
            size="sm"
            className="rounded-full hover:bg-primary/10 hover:border-primary transition-colors"
            onClick={() => onSelect(option.value, option.label)}
            disabled={disabled}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {options.some(o => o.description) && (
        <div className="text-xs text-muted-foreground space-y-1">
          {options.filter(o => o.description).map((option) => (
            <p key={option.value}>
              <span className="font-medium">{option.label}:</span> {option.description}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

// Common preference questions based on Singapore life contexts
export const PREFERENCE_QUESTIONS = {
  housing_status: {
    question: "What's your current housing situation?",
    preferenceKey: "housing_status",
    options: [
      { label: "Own HDB", value: "own_hdb", description: "You own an HDB flat" },
      { label: "Renting", value: "renting", description: "You're renting a place" },
      { label: "With Parents", value: "with_parents", description: "Living with family" },
      { label: "Own Condo/Private", value: "own_private", description: "You own private property" },
    ],
  },
  employment_type: {
    question: "What's your employment type?",
    preferenceKey: "employment_type",
    options: [
      { label: "Full-time Employee", value: "full_time" },
      { label: "Self-employed", value: "self_employed" },
      { label: "Freelancer/Gig", value: "freelancer" },
      { label: "Student", value: "student" },
      { label: "Retired", value: "retired" },
    ],
  },
  budget_preference: {
    question: "What's your budget preference for this?",
    preferenceKey: "budget_preference",
    options: [
      { label: "Budget-friendly", value: "budget" },
      { label: "Mid-range", value: "mid_range" },
      { label: "Premium", value: "premium" },
      { label: "No budget limit", value: "no_limit" },
    ],
  },
  family_status: {
    question: "What's your family situation?",
    preferenceKey: "family_status",
    options: [
      { label: "Single", value: "single" },
      { label: "Married, no kids", value: "married_no_kids" },
      { label: "Married with kids", value: "married_with_kids" },
      { label: "Single parent", value: "single_parent" },
    ],
  },
  citizenship_status: {
    question: "What's your residency status in Singapore?",
    preferenceKey: "citizenship_status",
    options: [
      { label: "Citizen", value: "citizen" },
      { label: "PR", value: "pr" },
      { label: "EP/SP Holder", value: "work_pass" },
      { label: "Student Pass", value: "student" },
      { label: "Tourist/Visitor", value: "visitor" },
    ],
  },
  timeline_preference: {
    question: "What's your timeline for this?",
    preferenceKey: "timeline_preference",
    options: [
      { label: "Urgent (< 1 month)", value: "urgent" },
      { label: "Soon (1-3 months)", value: "soon" },
      { label: "Planning ahead (3-12 months)", value: "planning" },
      { label: "Just exploring", value: "exploring" },
    ],
  },
};
