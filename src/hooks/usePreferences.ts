import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface UserPreference {
  id: string;
  anonymous_id: string;
  preference_key: string;
  preference_value: Json;
  confidence_level: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

// Get or create anonymous ID from localStorage
export const getAnonymousId = (): string => {
  const storageKey = "sg-life-guide-anonymous-id";
  let id = localStorage.getItem(storageKey);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(storageKey, id);
  }
  return id;
};

// Fetch all preferences for the current anonymous user
export const usePreferences = () => {
  return useQuery({
    queryKey: ["preferences", getAnonymousId()],
    queryFn: async () => {
      const anonymousId = getAnonymousId();
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("anonymous_id", anonymousId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as UserPreference[];
    },
  });
};

// Get a specific preference by key
export const usePreference = (key: string) => {
  return useQuery({
    queryKey: ["preference", getAnonymousId(), key],
    queryFn: async () => {
      const anonymousId = getAnonymousId();
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("anonymous_id", anonymousId)
        .eq("preference_key", key)
        .maybeSingle();

      if (error) throw error;
      return data as UserPreference | null;
    },
    enabled: !!key,
  });
};

// Save or update a preference
export const useSavePreference = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
      confidenceLevel = "explicit",
      source = "user_input",
    }: {
      key: string;
      value: Json;
      confidenceLevel?: string;
      source?: string;
    }) => {
      const anonymousId = getAnonymousId();
      // Check if preference exists
      const { data: existing } = await supabase
        .from("user_preferences")
        .select("id")
        .eq("anonymous_id", anonymousId)
        .eq("preference_key", key)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("user_preferences")
          .update({
            preference_value: value,
            confidence_level: confidenceLevel,
            source,
          })
          .eq("id", existing.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("user_preferences")
          .insert({
            anonymous_id: anonymousId,
            preference_key: key,
            preference_value: value,
            confidence_level: confidenceLevel,
            source,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      queryClient.invalidateQueries({ queryKey: ["preference"] });
    },
  });
};

// Delete a preference
export const useDeletePreference = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (key: string) => {
      const anonymousId = getAnonymousId();
      const { error } = await supabase
        .from("user_preferences")
        .delete()
        .eq("anonymous_id", anonymousId)
        .eq("preference_key", key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      queryClient.invalidateQueries({ queryKey: ["preference"] });
    },
  });
};

// Delete all preferences (for user control)
export const useDeleteAllPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const anonymousId = getAnonymousId();
      const { error } = await supabase
        .from("user_preferences")
        .delete()
        .eq("anonymous_id", anonymousId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      queryClient.invalidateQueries({ queryKey: ["preference"] });
    },
  });
};

// Export all preferences as JSON (PDPA compliance)
export const exportPreferences = async (): Promise<string> => {
  const anonymousId = getAnonymousId();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("preference_key, preference_value, confidence_level, source, created_at, updated_at")
    .eq("anonymous_id", anonymousId);

  if (error) throw error;

  const exportData = {
    exported_at: new Date().toISOString(),
    anonymous_id: anonymousId,
    preferences: data,
  };

  return JSON.stringify(exportData, null, 2);
};

// Get formatted preferences for AI context
export const getPreferencesContext = (preferences: UserPreference[]): string => {
  if (!preferences || preferences.length === 0) return "";

  let context = "\n\nUSER PREFERENCES (from previous interactions):\n";
  
  preferences.forEach((pref) => {
    const confidenceLabel = 
      pref.confidence_level === "explicit" ? "User stated" :
      pref.confidence_level === "inferred" ? "Inferred from conversation" :
      "Assumed";
    
    context += `- ${pref.preference_key}: ${JSON.stringify(pref.preference_value)} (${confidenceLabel})\n`;
  });

  return context;
};
