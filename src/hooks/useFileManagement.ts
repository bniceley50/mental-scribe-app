import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import {
    extractTextFromFile,
    uploadFileToStorage,
    saveFileMetadata,
    getConversationFiles,
    deleteFile,
} from "@/lib/fileUpload";

export interface UploadedFile {
    id: string;
    file_name: string;
    file_type: string;
    file_url: string;
    processed_content: string;
}

interface UseFileManagementProps {
    conversationId: string | null;
    onConversationCreated?: (id: string) => void;
    createConversation: (title: string, isPart2Protected: boolean, clientId: string) => Promise<string | null>;
    isPart2Protected: boolean;
    selectedClientId: string;
}

export const useFileManagement = ({
    conversationId,
    onConversationCreated,
    createConversation,
    isPart2Protected,
    selectedClientId,
}: UseFileManagementProps) => {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [showFileUpload, setShowFileUpload] = useState(false);

    const loadConversationFiles = useCallback(async () => {
        if (!conversationId) {
            setUploadedFiles([]);
            return;
        }
        try {
            const files = await getConversationFiles(conversationId);
            setUploadedFiles(files);
        } catch (error) {
            logger.error("Error loading files", error as Error, { conversationId });
        }
    }, [conversationId]);

    useEffect(() => {
        loadConversationFiles();
    }, [loadConversationFiles]);

    const handleFileSelect = async (file: File) => {
        let currentConversationId = conversationId;

        if (!currentConversationId) {
            const title = `Document Analysis: ${file.name}`;
            currentConversationId = await createConversation(
                title,
                isPart2Protected,
                selectedClientId
            );

            if (!currentConversationId) {
                toast.error("Failed to create conversation");
                return;
            }

            onConversationCreated?.(currentConversationId);
        }

        try {
            setIsUploading(true);
            toast.info("Processing file...");
            const extractedText = await extractTextFromFile(file);
            const uploadResult = await uploadFileToStorage(file, currentConversationId);
            if (!uploadResult) return;

            const fileType = file.type === "application/pdf" ? "pdf" : "text";

            const fileId = await saveFileMetadata(
                currentConversationId,
                file.name,
                fileType,
                uploadResult.url,
                extractedText
            );

            if (fileId) {
                toast.success("File uploaded successfully!");
                await loadConversationFiles();
                setShowFileUpload(false);
            }
        } catch (error: any) {
            logger.error("Error processing file", error, { fileName: file.name });
            toast.error(error.message || "Failed to process file");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteFile = async (fileId: string) => {
        const file = uploadedFiles.find((f) => f.id === fileId);
        if (!file) return;

        try {
            const filePath = file.file_url.split("/clinical-documents/")[1];
            const success = await deleteFile(fileId, filePath);
            if (success) {
                await loadConversationFiles();
                toast.success("File deleted");
            }
        } catch (error) {
            logger.error("Error deleting file", error as Error, { fileId });
            toast.error("Failed to delete file");
        }
    };

    const clearFiles = () => {
        setUploadedFiles([]);
    };

    return {
        uploadedFiles,
        isUploading,
        showFileUpload,
        setShowFileUpload,
        handleFileSelect,
        handleDeleteFile,
        clearFiles,
        refreshFiles: loadConversationFiles
    };
};
