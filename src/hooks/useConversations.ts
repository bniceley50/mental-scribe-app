import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setConversations(data || []);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversation history");
    } finally {
      setLoading(false);
    }
  };

  const createConversation = async (title: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("conversations")
        .insert([{ user_id: user.id, title }])
        .select("id")
        .single();

      if (error) throw error;
      
      await fetchConversations();
      return data.id;
    } catch (error: any) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
      return null;
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;
      
      await fetchConversations();
      toast.success("Conversation deleted");
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
    }
  };

  useEffect(() => {
    fetchConversations();

    // Set up realtime subscription
    const channel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    conversations,
    loading,
    createConversation,
    deleteConversation,
    refreshConversations: fetchConversations,
  };
};
