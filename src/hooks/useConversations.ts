import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_part2_protected?: boolean;
  data_classification?: string;
  part2_consent_status?: string;
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [limit] = useState(20);

  const fetchConversations = async (offset = 0) => {
    try {
      const { data, error, count } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at, is_part2_protected, data_classification, part2_consent_status, client_id", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      // SECURITY FIX: Log PHI access for each conversation viewed
      if (data && data.length > 0) {
        // Log access for conversations with client_id (PHI)
        for (const convo of data) {
          if (convo.client_id) {
            try {
              await supabase.rpc('log_client_view', {
                _client_id: convo.client_id,
                _access_method: 'conversation_list'
              });
            } catch (logError) {
              // Don't block UI on logging failure, but log error
              console.error('Failed to log client view:', logError);
            }
          }
        }
      }
      
      if (offset === 0) {
        setConversations(data || []);
      } else {
        setConversations((prev) => [...prev, ...(data || [])]);
      }
      
      setHasMore((data?.length || 0) === limit);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversation history");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchConversations(conversations.length);
    }
  };

  const createConversation = async (
    title: string, 
    isPart2Protected: boolean = false,
    clientId?: string
  ): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("conversations")
        .insert([{ 
          user_id: user.id, 
          title,
          is_part2_protected: isPart2Protected,
          data_classification: isPart2Protected ? 'part2_protected' : 'standard_phi',
          client_id: clientId && clientId !== 'none' ? clientId : null
        }])
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
    hasMore,
    createConversation,
    deleteConversation,
    refreshConversations: fetchConversations,
    loadMore,
  };
};
