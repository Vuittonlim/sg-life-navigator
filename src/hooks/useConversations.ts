import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Conversation {
  id: string;
  anonymous_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// Fetch all conversations for the authenticated user
export const useConversations = () => {
  const { user, isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("anonymous_id", user.id)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data as Conversation[];
    },
    enabled: isAuthenticated && !!user?.id,
  });
};

// Fetch a single conversation with its messages
export const useConversation = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return messages as Message[];
    },
    enabled: !!conversationId,
  });
};

// Create a new conversation
export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (title: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("conversations")
        .insert({ anonymous_id: user.id, title })
        .select()
        .single();
      
      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });
};

// Update conversation title
export const useUpdateConversationTitle = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { data, error } = await supabase
        .from("conversations")
        .update({ title })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });
};

// Save a message
export const useSaveMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      role, 
      content 
    }: { 
      conversationId: string; 
      role: "user" | "assistant"; 
      content: string;
    }) => {
      const { data, error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversationId, role, content })
        .select()
        .single();
      
      if (error) throw error;
      return data as Message;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversation", data.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

// Delete a conversation
export const useDeleteConversation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);
      
      if (error) throw error;
      return conversationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });
};
