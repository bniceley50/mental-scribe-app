import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { toast as showToast } from "sonner";
import DOMPurify from "dompurify";

/**
 * Represents a message in a conversation
 */
interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

/**
 * Sanitizes text content to prevent XSS and injection attacks
 * @param content - The text content to sanitize
 * @returns Sanitized text content
 */
const sanitizeContent = (content: string): string => {
  return DOMPurify.sanitize(content, { ALLOWED_TAGS: [] });
};

/**
 * Creates a download link and triggers a file download
 * @param blob - The file blob to download
 * @param filename - The name for the downloaded file
 */
const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  
  try {
    // Append to body, click, and cleanup
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    // Always cleanup, even if click fails
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
};

/**
 * Exports a conversation to a PDF file
 * @param conversationId - The ID of the conversation to export
 * @param title - The title for the exported PDF
 */
export const exportConversationToPDF = async (conversationId: string, title: string) => {
  try {
    showToast.info("Generating PDF...");

    // Fetch messages
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Create PDF
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let y = margin;

    // Sanitize and add title
    const sanitizedTitle = sanitizeContent(title);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(sanitizedTitle, margin, y);
    y += 10;

    // Add date
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 15;

    pdf.setTextColor(0);

    // Add messages
    messages?.forEach((message: Message) => {
      // Check if we need a new page
      if (y > pageHeight - 40) {
        pdf.addPage();
        y = margin;
      }

      // Message header
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      const role = message.role === "user" ? "You" : "AI Assistant";
      const timestamp = new Date(message.created_at).toLocaleString();
      pdf.text(`${role} - ${timestamp}`, margin, y);
      y += 7;

      // Sanitize and add message content
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const sanitizedContent = sanitizeContent(message.content);
      const lines = pdf.splitTextToSize(sanitizedContent, maxWidth);
      
      lines.forEach((line: string) => {
        if (y > pageHeight - 20) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += 5;
      });

      y += 5; // Space between messages
    });

    // Save PDF with sanitized filename
    const sanitizedFilename = sanitizeContent(title).replace(/[^a-z0-9]/gi, "_");
    const fileName = `${sanitizedFilename}_${Date.now()}.pdf`;
    pdf.save(fileName);
    showToast.success("PDF downloaded successfully!");
  } catch (error: any) {
    console.error("Error exporting to PDF:", error);
    showToast.error("Failed to export PDF");
  }
};

/**
 * Exports a conversation to a plain text file
 * @param conversationId - The ID of the conversation to export
 * @param title - The title for the exported text file
 */
export const exportConversationToText = async (conversationId: string, title: string) => {
  try {
    // Fetch messages
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Sanitize title
    const sanitizedTitle = sanitizeContent(title);

    // Create text content with sanitized data
    let text = `${sanitizedTitle}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += "=".repeat(80) + "\n\n";

    messages?.forEach((message: Message) => {
      const role = message.role === "user" ? "You" : "AI Assistant";
      const timestamp = new Date(message.created_at).toLocaleString();
      const sanitizedContent = sanitizeContent(message.content);
      
      text += `[${role} - ${timestamp}]\n`;
      text += `${sanitizedContent}\n\n`;
      text += "-".repeat(80) + "\n\n";
    });

    // Download as text file with proper cleanup
    const blob = new Blob([text], { type: "text/plain" });
    const sanitizedFilename = sanitizeContent(title).replace(/[^a-z0-9]/gi, "_");
    const filename = `${sanitizedFilename}_${Date.now()}.txt`;
    
    triggerDownload(blob, filename);
    showToast.success("Text file downloaded successfully!");
  } catch (error: any) {
    console.error("Error exporting to text:", error);
    showToast.error("Failed to export text file");
  }
};

/**
 * Copies a conversation to the clipboard as formatted text
 * @param conversationId - The ID of the conversation to copy
 * @param title - The title for the copied content
 */
export const copyConversationToClipboard = async (conversationId: string, title: string) => {
  try {
    // Fetch messages
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Sanitize title
    const sanitizedTitle = sanitizeContent(title);

    // Create formatted text with sanitized content
    let text = `${sanitizedTitle}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += "=".repeat(80) + "\n\n";

    messages?.forEach((message: Message) => {
      const role = message.role === "user" ? "You" : "AI Assistant";
      const timestamp = new Date(message.created_at).toLocaleString();
      const sanitizedContent = sanitizeContent(message.content);
      
      text += `[${role} - ${timestamp}]\n`;
      text += `${sanitizedContent}\n\n`;
      text += "-".repeat(80) + "\n\n";
    });

    // Copy to clipboard
    await navigator.clipboard.writeText(text);
    showToast.success("Copied to clipboard!");
  } catch (error: any) {
    console.error("Error copying to clipboard:", error);
    showToast.error("Failed to copy to clipboard");
  }
};
