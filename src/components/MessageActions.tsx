import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import ReactMarkdown from "react-markdown";

interface MessageActionsProps {
  content: string;
  isStreaming?: boolean;
  onRegenerate?: () => void;
}

export const MessageActions = ({ content, isStreaming, onRegenerate }: MessageActionsProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      
      // Split text into lines that fit the page width
      const lines = doc.splitTextToSize(content, maxWidth);
      
      doc.setFont("helvetica");
      doc.setFontSize(11);
      
      let yPosition = margin;
      const lineHeight = 7;
      const pageHeight = doc.internal.pageSize.getHeight();
      
      lines.forEach((line: string) => {
        if (yPosition + lineHeight > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
      
      doc.save(`clinical-analysis-${Date.now()}.pdf`);
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export PDF");
    }
  };

  if (isStreaming) return null;

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-7 text-xs"
      >
        {copied ? (
          <Check className="w-3 h-3 mr-1" />
        ) : (
          <Copy className="w-3 h-3 mr-1" />
        )}
        {copied ? "Copied!" : "Copy"}
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExportPDF}
        className="h-7 text-xs"
      >
        <Download className="w-3 h-3 mr-1" />
        Export PDF
      </Button>

      {onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          className="h-7 text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Regenerate
        </Button>
      )}
    </div>
  );
};

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
}

export const StreamingMessage = ({ content, isStreaming }: StreamingMessageProps) => {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mb-3 text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mb-2 text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mb-2 text-foreground">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed text-foreground">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 space-y-1 text-foreground">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1 text-foreground">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-foreground">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-foreground">{children}</em>
          ),
          code: ({ children }) => (
            <code className="px-1 py-0.5 rounded bg-muted text-foreground font-mono text-sm">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="p-3 rounded-lg bg-muted overflow-x-auto mb-3">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      
      {isStreaming && (
        <span className="inline-flex items-center gap-1 ml-1 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </span>
      )}
    </div>
  );
};
