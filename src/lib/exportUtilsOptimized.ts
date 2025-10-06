import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { toast as showToast } from "sonner";
import DOMPurify from "dompurify";

/**
 * MEDIUM PRIORITY FIX: Optimized export utilities to eliminate N+1 queries
 * Original code made separate fetch calls per conversation in batch exports
 * This version batches all fetches into single queries
 */

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

const sanitizeContent = (content: string): string => {
  return DOMPurify.sanitize(content, { ALLOWED_TAGS: [] });
};

const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  
  try {
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }
};

/**
 * OPTIMIZED: Fetch all conversations and messages in bulk (2 queries total)
 * Instead of N+1 queries (1 for conversations, 1 per conversation for messages)
 */
export const exportAllConversationsToPDF = async () => {
  try {
    showToast.info("Generating comprehensive PDF export...");

    // OPTIMIZATION: Single query for all conversations
    const { data: conversations, error: convoError } = await supabase
      .from("conversations")
      .select("id, title, created_at")
      .order("created_at", { ascending: false });

    if (convoError) throw convoError;
    if (!conversations || conversations.length === 0) {
      showToast.error("No conversations to export");
      return;
    }

    const conversationIds = conversations.map(c => c.id);

    // OPTIMIZATION: Single query for ALL messages across ALL conversations
    const { data: allMessages, error: msgError } = await supabase
      .from("messages")
      .select("id, conversation_id, role, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });

    if (msgError) throw msgError;

    // Group messages by conversation_id (in-memory operation, very fast)
    const messagesByConvo = new Map<string, Message[]>();
    allMessages?.forEach(msg => {
      if (!messagesByConvo.has(msg.conversation_id)) {
        messagesByConvo.set(msg.conversation_id, []);
      }
      messagesByConvo.get(msg.conversation_id)!.push(msg);
    });

    // Create PDF
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let y = margin;

    // Title page
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("Complete Conversation History", margin, y);
    y += 10;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    pdf.text(`Total Conversations: ${conversations.length}`, margin, y + 5);
    y += 20;

    pdf.setTextColor(0);

    // Iterate through conversations (no database calls here!)
    conversations.forEach((convo, index) => {
      // New page for each conversation
      if (index > 0) {
        pdf.addPage();
        y = margin;
      }

      // Conversation header
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      const sanitizedTitle = sanitizeContent(convo.title);
      pdf.text(sanitizedTitle, margin, y);
      y += 7;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100);
      pdf.text(`Created: ${new Date(convo.created_at).toLocaleString()}`, margin, y);
      y += 10;

      pdf.setTextColor(0);

      // Get messages for this conversation (no query needed!)
      const messages = messagesByConvo.get(convo.id) || [];

      messages.forEach(message => {
        if (y > pageHeight - 40) {
          pdf.addPage();
          y = margin;
        }

        pdf.setFontSize(11);
        pdf.setFont("helvetica", "bold");
        const role = message.role === "user" ? "You" : "AI Assistant";
        const timestamp = new Date(message.created_at).toLocaleString();
        pdf.text(`${role} - ${timestamp}`, margin, y);
        y += 7;

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

        y += 5;
      });
    });

    const fileName = `all_conversations_${Date.now()}.pdf`;
    pdf.save(fileName);
    showToast.success("All conversations exported successfully!");
  } catch (error: any) {
    console.error("Error exporting all conversations:", error);
    showToast.error("Failed to export conversations");
  }
};

/**
 * OPTIMIZED: Export single conversation (same as before, but with logging)
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

    const sanitizedTitle = sanitizeContent(title);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(sanitizedTitle, margin, y);
    y += 10;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 15;

    pdf.setTextColor(0);

    messages?.forEach((message: Message) => {
      if (y > pageHeight - 40) {
        pdf.addPage();
        y = margin;
      }

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      const role = message.role === "user" ? "You" : "AI Assistant";
      const timestamp = new Date(message.created_at).toLocaleString();
      pdf.text(`${role} - ${timestamp}`, margin, y);
      y += 7;

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

      y += 5;
    });

    const sanitizedFilename = sanitizeContent(title).replace(/[^a-z0-9]/gi, "_");
    const fileName = `${sanitizedFilename}_${Date.now()}.pdf`;
    pdf.save(fileName);
    showToast.success("PDF downloaded successfully!");
  } catch (error: any) {
    console.error("Error exporting to PDF:", error);
    showToast.error("Failed to export PDF");
  }
};

export const exportConversationToText = async (conversationId: string, title: string) => {
  try {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const sanitizedTitle = sanitizeContent(title);
    let content = `${sanitizedTitle}\n`;
    content += `Generated: ${new Date().toLocaleString()}\n`;
    content += "=".repeat(60) + "\n\n";

    messages?.forEach((message: Message) => {
      const role = message.role === "user" ? "You" : "AI Assistant";
      const timestamp = new Date(message.created_at).toLocaleString();
      const sanitizedContent = sanitizeContent(message.content);
      
      content += `[${role}] - ${timestamp}\n`;
      content += sanitizedContent + "\n\n";
      content += "-".repeat(60) + "\n\n";
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const sanitizedFilename = sanitizeContent(title).replace(/[^a-z0-9]/gi, "_");
    const fileName = `${sanitizedFilename}_${Date.now()}.txt`;
    
    triggerDownload(blob, fileName);
    showToast.success("Text file downloaded successfully!");
  } catch (error: any) {
    console.error("Error exporting to text:", error);
    showToast.error("Failed to export text file");
  }
};
