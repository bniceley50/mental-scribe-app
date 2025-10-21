import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";

export interface FetchMessagesParams {
  conversationId: string;
  before?: string; // ISO timestamp cursor (exclusive)
  limit?: number;
}

export interface MessageDTO {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export async function fetchMessagesPage({
  conversationId,
  before,
  limit = DEFAULT_PAGE_SIZE,
}: FetchMessagesParams): Promise<{ data: MessageDTO[]; error: any }>
{
  let query = supabase
    .from("messages")
    .select("id, conversation_id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    // keyset: fetch strictly older
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  return { data: (data as MessageDTO[]) || [], error };
}
