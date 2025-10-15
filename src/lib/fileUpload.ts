import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import DOMPurify from "dompurify";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF

interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  processed_content: string;
}

const verifyPDFMagicBytes = async (file: File): Promise<boolean> => {
  const buffer = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  return PDF_MAGIC_BYTES.every((byte, index) => bytes[index] === byte);
};

export const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n\n";
    }

    return fullText.trim();
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
};

export const extractTextFromFile = async (file: File): Promise<string> => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of 10MB`);
  }

  if (file.type === "application/pdf") {
    const isValidPDF = await verifyPDFMagicBytes(file);
    if (!isValidPDF) {
      throw new Error("Invalid PDF file format");
    }
    const rawText = await extractTextFromPDF(file);
    return DOMPurify.sanitize(rawText, { ALLOWED_TAGS: [] });
  } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
    const rawText = await file.text();
    return DOMPurify.sanitize(rawText, { ALLOWED_TAGS: [] });
  } else {
    throw new Error("Unsupported file type");
  }
};

export const uploadFileToStorage = async (
  file: File,
  conversationId: string
): Promise<{ url: string; path: string } | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    if (!["application/pdf", "text/plain"].includes(file.type)) {
      throw new Error("Only PDF and text files are allowed");
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${conversationId}/${Date.now()}.${fileExt}`;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("path", fileName);

    const res = await fetch("/functions/v1/storage-upload-guard", {
      method: "POST",
      body: fd,
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof payload?.error === "string" ? payload.error : await res.text());
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from("clinical-documents")
      .createSignedUrl(fileName, 3600);

    if (signedError) throw signedError;

    return { url: signedData.signedUrl, path: fileName };
  } catch (error: any) {
    console.error("Error uploading file:", error);
    toast.error(error.message || "Failed to upload file");
    return null;
  }
};

export const saveFileMetadata = async (
  conversationId: string,
  fileName: string,
  fileType: string,
  fileUrl: string,
  processedContent: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("uploaded_files")
      .insert([
        {
          conversation_id: conversationId,
          file_name: fileName,
          file_type: fileType,
          file_url: fileUrl,
          processed_content: processedContent,
        },
      ])
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  } catch (error: any) {
    console.error("Error saving file metadata:", error);
    toast.error("Failed to save file metadata");
    return null;
  }
};

export const getConversationFiles = async (
  conversationId: string
): Promise<UploadedFile[]> => {
  try {
    const { data, error } = await supabase
      .from("uploaded_files")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error("Error fetching files:", error);
    return [];
  }
};

export const deleteFile = async (fileId: string, filePath: string): Promise<boolean> => {
  try {
    const { error: storageError } = await supabase.storage
      .from("clinical-documents")
      .remove([filePath]);

    if (storageError) throw storageError;

    const { error: dbError } = await supabase
      .from("uploaded_files")
      .delete()
      .eq("id", fileId);

    if (dbError) throw dbError;

    toast.success("File deleted");
    return true;
  } catch (error: any) {
    console.error("Error deleting file:", error);
    toast.error("Failed to delete file");
    return false;
  }
};
