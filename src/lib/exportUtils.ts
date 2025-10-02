import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { toast as showToast } from "sonner";

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

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

    // Add title
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, margin, y);
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

      // Message content
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const lines = pdf.splitTextToSize(message.content, maxWidth);
      
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

    // Save PDF
    const fileName = `${title.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.pdf`;
    pdf.save(fileName);
    showToast.success("PDF downloaded successfully!");
  } catch (error: any) {
    console.error("Error exporting to PDF:", error);
    showToast.error("Failed to export PDF");
  }
};

export const exportConversationToText = async (conversationId: string, title: string) => {
  try {
    // Fetch messages
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Create text content
    let text = `${title}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += "=".repeat(80) + "\n\n";

    messages?.forEach((message: Message) => {
      const role = message.role === "user" ? "You" : "AI Assistant";
      const timestamp = new Date(message.created_at).toLocaleString();
      text += `[${role} - ${timestamp}]\n`;
      text += `${message.content}\n\n`;
      text += "-".repeat(80) + "\n\n";
    });

    // Download as text file
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast.success("Text file downloaded successfully!");
  } catch (error: any) {
    console.error("Error exporting to text:", error);
    showToast.error("Failed to export text file");
  }
};

export const copyConversationToClipboard = async (conversationId: string, title: string) => {
  try {
    // Fetch messages
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Create formatted text
    let text = `${title}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += "=".repeat(80) + "\n\n";

    messages?.forEach((message: Message) => {
      const role = message.role === "user" ? "You" : "AI Assistant";
      const timestamp = new Date(message.created_at).toLocaleString();
      text += `[${role} - ${timestamp}]\n`;
      text += `${message.content}\n\n`;
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
