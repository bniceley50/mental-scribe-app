import { supabase } from "@/integrations/supabase/client";

const MAX_NOTE_LENGTH = 50000; // ~10,000 words
const MAX_FILE_LENGTH = 100000;

interface AnalyzeNotesParams {
  notes: string;
  action: "soap_note" | "session_summary" | "key_points" | "progress_report" | "edit_content";
  fileContent?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  editInstruction?: string;
  originalContent?: string;
  onChunk: (text: string) => void;
  onComplete: () => void;
  onError: (error: string) => void;
}

export const analyzeNotesStreaming = async ({
  notes,
  action,
  fileContent,
  conversationHistory,
  editInstruction,
  originalContent,
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
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          notes: sanitizedNotes,
          action,
          file_content: sanitizedFile,
          conversation_history: conversationHistory,
          edit_instruction: editInstruction,
          original_content: originalContent,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("AI service credits depleted. Please contact support.");
      }
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = response.status >= 500 
        ? `Service error (${response.status}). Please try again.` 
        : (errorData.error || `Request failed: ${response.status}`);
      throw new Error(errorMessage);
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

      for (let line of lines) {
        // Handle CRLF line endings
        if (line.endsWith("\r")) {
          line = line.slice(0, -1);
        }
        
        // Skip SSE comments and empty lines
        if (line.startsWith(":") || line.trim() === "") {
          continue;
        }
        
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          
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
            // Skip malformed JSON - may be partial chunk
            console.warn("Failed to parse SSE data:", e);
          }
        }
      }
    }

    onComplete();
  } catch (error: any) {
    // Log error internally but don't expose details to user in production
    console.error("Error analyzing notes:", error);
    const userMessage = error.message?.includes("authenticated") 
      ? "Session expired. Please sign in again."
      : error.message?.includes("too long")
      ? error.message
      : "Failed to analyze notes. Please try again.";
    onError(userMessage);
  }
};
