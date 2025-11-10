import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export const useMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  const fetchMessages = async (loadMore = false) => {
    if (!conversationId) {
      setMessages([]);
      setHasMore(true);
      setOldestMessageTimestamp(null);
      return;
    }

    setLoading(true);
    try {
      // SECURITY FIX: Get conversation details first to check if it has a client_id
      const { data: conversation, error: convoError } = await supabase
        .from("conversations")
        .select("client_id")
        .eq("id", conversationId)
        .single();

      if (convoError) throw convoError;

      // SECURITY FIX: Log PHI access if conversation is linked to a client
      if (conversation?.client_id) {
        try {
          await supabase.rpc('log_client_view', {
            _client_id: conversation.client_id,
            _access_method: 'message_view'
          });
        } catch (logError) {
          console.error('Failed to log client view:', logError);
          // Don't block message loading on logging failure
        }
      }

      // Keyset pagination: fetch messages older than the oldest we have
      let query = supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE + 1);

      // If loading more, fetch only older messages
      if (loadMore && oldestMessageTimestamp) {
        query = query.lt("created_at", oldestMessageTimestamp);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Check if there are more messages
      const hasMoreMessages = (data?.length || 0) > PAGE_SIZE;
      const messagesToDisplay = hasMoreMessages ? data!.slice(0, PAGE_SIZE) : (data || []);
      
      // Cast the data to Message[] type
      const typedMessages = messagesToDisplay.map(msg => ({
        ...msg,
        role: msg.role as "user" | "assistant"
      }));
      
      // Reverse to show oldest first (since we fetched newest first for pagination)
      const reversedMessages = [...typedMessages].reverse();
      
      if (loadMore) {
        // Prepend older messages
        setMessages(prev => [...reversedMessages, ...prev]);
      } else {
        // Initial load
        setMessages(reversedMessages);
      }
      
      setHasMore(hasMoreMessages);
      
      // Update the oldest timestamp for next pagination
      if (reversedMessages.length > 0) {
        setOldestMessageTimestamp(reversedMessages[0].created_at);
      }
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const loadOlderMessages = () => {
    if (!loading && hasMore) {
      fetchMessages(true);
    }
  };

  const addMessage = async (role: "user" | "assistant", content: string, targetConversationId?: string) => {
    const convId = targetConversationId ?? conversationId;
    if (!convId) {
      toast.error("No conversation selected");
      return null;
    }

    try {
      // Ensure user owns the conversation to avoid RLS errors
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) {
        toast.error("Please sign in to send messages");
        return null;
      }

      const { data: convo, error: convoErr } = await supabase
        .from("conversations")
        .select("user_id")
        .eq("id", convId)
        .single();
      if (convoErr) throw convoErr;
      if (convo?.user_id !== userId) {
        toast.error("You don’t have access to this conversation");
        return null;
      }

      const { data, error } = await supabase
        .from("messages")
        .insert([{ conversation_id: convId, role, content }])
        .select()
        .single();

      if (error) throw error;

      // Update conversation's updated_at timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);

      return data;
    } catch (error: any) {
      console.error("Error adding message:", error);
      toast.error(error?.message || "Failed to save message");
      return null;
    }
  };
  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    // Set up realtime subscription for messages
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return {
    messages,
    loading,
    hasMore,
    addMessage,
    refreshMessages: fetchMessages,
    loadOlderMessages,
  };
};
