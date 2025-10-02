import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, X, File, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  processed_content: string;
}

interface FilePreviewProps {
  file: UploadedFile;
  onDelete: (fileId: string) => void;
  onAnalyze: (content: string, fileName: string) => void;
}

export const FilePreview = ({ file, onDelete, onAnalyze }: FilePreviewProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getFileIcon = (fileType: string) => {
    if (fileType === "pdf") {
      return <FileText className="w-6 h-6 text-destructive" />;
    }
    return <File className="w-6 h-6 text-primary" />;
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  return (
    <Card className="p-4 border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {getFileIcon(file.file_type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {file.file_name}
              </p>
              <p className="text-xs text-muted-foreground uppercase mt-1">
                {file.file_type} file
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(file.id)}
              className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between text-xs h-8"
              >
                <span>Preview extracted text</span>
                {isOpen ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-2">
              <div className="p-3 bg-muted/50 rounded-md text-xs text-muted-foreground max-h-40 overflow-y-auto">
                {isOpen ? file.processed_content : truncateContent(file.processed_content)}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button
            onClick={() => onAnalyze(file.processed_content, file.file_name)}
            className="w-full mt-3 bg-primary hover:bg-primary/90 h-8 text-xs"
          >
            <Sparkles className="w-3 h-3 mr-2" />
            Analyze this document
          </Button>
        </div>
      </div>
    </Card>
  );
};
