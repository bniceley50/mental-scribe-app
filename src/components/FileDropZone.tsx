import { useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { Upload, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".doc", ".docx"];

export const FileDropZone = ({ onFileSelect, disabled }: FileDropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size exceeds 10MB limit. Selected file: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return false;
    }

    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    const isValidType = ACCEPTED_FILE_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(fileExtension);

    if (!isValidType) {
      toast.error("Invalid file type. Please upload PDF, TXT, DOC, or DOCX files");
      return false;
    }

    return true;
  };

  const handleFile = useCallback(
    async (file: File) => {
      if (disabled || isProcessing) return;

      if (!validateFile(file)) return;

      setIsProcessing(true);
      try {
        onFileSelect(file);
      } catch (error) {
        console.error("Error handling file:", error);
        toast.error("Failed to process file");
      } finally {
        setIsProcessing(false);
      }
    },
    [onFileSelect, disabled, isProcessing]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled || isProcessing) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile, disabled, isProcessing]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isProcessing) {
      setIsDragging(true);
    }
  }, [disabled, isProcessing]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled || isProcessing) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPTED_EXTENSIONS.join(",");
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [handleFile, disabled, isProcessing]);

  return (
    <Card
      className={cn(
        "p-8 border-2 border-dashed transition-all cursor-pointer",
        "hover:border-primary/50 hover:bg-primary/5",
        isDragging && "border-primary bg-primary/10",
        disabled && "opacity-50 cursor-not-allowed",
        isProcessing && "cursor-wait"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        {isProcessing ? (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div>
              <p className="text-sm font-medium text-foreground">Processing file...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Extracting text content
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              {isDragging ? (
                <FileText className="w-8 h-8 text-primary" />
              ) : (
                <Upload className="w-8 h-8 text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {isDragging ? "Drop file here" : "Drop files here or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, TXT, DOC, DOCX • Max 10MB
              </p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
