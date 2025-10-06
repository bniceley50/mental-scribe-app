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

  const fetchMessages = async () => {
    if (!conversationId) {
      setMessages([]);
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

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Cast the data to Message[] type
      const typedMessages = (data || []).map(msg => ({
        ...msg,
        role: msg.role as "user" | "assistant"
      }));
      
      setMessages(typedMessages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const addMessage = async (role: "user" | "assistant", content: string) => {
    if (!conversationId) return null;

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert([{ conversation_id: conversationId, role, content }])
        .select()
        .single();

      if (error) throw error;

      // Update conversation's updated_at timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      return data;
    } catch (error: any) {
      console.error("Error adding message:", error);
      toast.error("Failed to save message");
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
    addMessage,
    refreshMessages: fetchMessages,
  };
};
