import { supabase } from "@/integrations/supabase/client";

const MAX_NOTE_LENGTH = 50000; // ~10,000 words
const MAX_FILE_LENGTH = 100000;

interface AnalyzeNotesParams {
  notes: string;
  action: "soap_note" | "session_summary" | "key_points" | "progress_report";
  fileContent?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

export const analyzeNotesStreaming = async ({
  notes,
  action,
  fileContent,
  conversationHistory,
  onChunk,
  onComplete,
  onError,
}: AnalyzeNotesParams) => {
  try {
    // Validate input lengths
    if (notes.length > MAX_NOTE_LENGTH) {
      onError("Clinical note is too long. Please limit to 10,000 words.");
      return;
    }

    if (fileContent && fileContent.length > MAX_FILE_LENGTH) {
      onError("Uploaded file content is too long. Please use smaller files.");
      return;
    }

    // Sanitize notes - remove potentially harmful content
    const sanitizedNotes = notes.trim();
    const sanitizedFile = fileContent?.trim();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("User not authenticated");
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-clinical-notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          notes: sanitizedNotes,
          action,
          file_content: sanitizedFile,
          conversation_history: conversationHistory,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          
          if (data === "[DONE]") {
            onComplete();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // Skip malformed JSON
            console.warn("Failed to parse SSE data:", e);
          }
        }
      }
    }

    onComplete();
  } catch (error: any) {
    console.error("Error analyzing notes:", error);
    onError(error.message || "Failed to analyze notes");
  }
};
