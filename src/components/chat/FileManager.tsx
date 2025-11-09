import { Paperclip } from "lucide-react";
import { FileDropZone } from "@/components/FileDropZone";
import { FilePreview } from "@/components/FilePreview";

interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  processed_content: string;
}

interface FileManagerProps {
  uploadedFiles: UploadedFile[];
  showFileUpload: boolean;
  loading: boolean;
  onFileSelect: (file: File) => void;
  onDeleteFile: (fileId: string) => void;
  onAnalyzeFile: (content: string, fileName: string) => void;
}

export const FileManager = ({
  uploadedFiles,
  showFileUpload,
  loading,
  onFileSelect,
  onDeleteFile,
  onAnalyzeFile,
}: FileManagerProps) => {
  return (
    <>
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Uploaded Documents ({uploadedFiles.length})
          </p>
          {uploadedFiles.map((file) => (
            <FilePreview
              key={file.id}
              file={file}
              onDelete={onDeleteFile}
              onAnalyze={onAnalyzeFile}
            />
          ))}
        </div>
      )}

      {showFileUpload && (
        <FileDropZone onFileSelect={onFileSelect} disabled={loading} />
      )}
    </>
  );
};
