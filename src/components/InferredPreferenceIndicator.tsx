import { Lightbulb, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InferredPreference {
  key: string;
  value: string;
  label: string;
}

interface InferredPreferenceIndicatorProps {
  preferences: InferredPreference[];
  onDismiss?: () => void;
}

export const InferredPreferenceIndicator = ({ 
  preferences,
  onDismiss 
}: InferredPreferenceIndicatorProps) => {
  if (preferences.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex items-start gap-2 px-3 py-2 my-2 ml-12 mr-4 rounded-lg bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/30"
      >
        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center mt-0.5">
          <Lightbulb className="w-3 h-3 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
            I learned something about you:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {preferences.map((pref, idx) => (
              <motion.span
                key={pref.key}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1, duration: 0.2 }}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200"
              >
                <Check className="w-3 h-3" />
                {pref.label}
              </motion.span>
            ))}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-amber-400 hover:text-amber-600 dark:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            <span className="sr-only">Dismiss</span>
            ×
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
