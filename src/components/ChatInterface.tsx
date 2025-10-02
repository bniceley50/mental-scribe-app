import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, FileText, Sparkles, Clock, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMessages, Message as DBMessage } from "@/hooks/useMessages";
import { useConversations } from "@/hooks/useConversations";
import { FileDropZone } from "./FileDropZone";
import { FilePreview } from "./FilePreview";
import {
  extractTextFromFile,
  uploadFileToStorage,
  saveFileMetadata,
  getConversationFiles,
  deleteFile,
} from "@/lib/fileUpload";
import { analyzeNotesStreaming } from "@/lib/openai";

interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  processed_content: string;
}

interface ChatInterfaceProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}

const ChatInterface = ({ conversationId, onConversationCreated }: ChatInterfaceProps) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages: dbMessages, addMessage } = useMessages(conversationId);
  const { createConversation } = useConversations();

  const [displayMessages, setDisplayMessages] = useState<Array<DBMessage & { isStreaming?: boolean }>>([]);

  useEffect(() => {
    if (dbMessages.length === 0 && !conversationId) {
      // Show welcome message for new conversations
      setDisplayMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hello! I'm your ClinicalAI Assistant. I can help you:\n\n• Generate comprehensive SOAP notes from your session observations\n• Create detailed session summaries\n• Extract key clinical points\n• Develop progress reports\n\nSimply paste your session notes below, upload a file, or use one of the quick actions to get started.",
          created_at: new Date().toISOString(),
        },
      ]);
    } else {
      setDisplayMessages(dbMessages);
    }
  }, [dbMessages, conversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);

  useEffect(() => {
    if (conversationId) {
      loadConversationFiles();
    } else {
      setUploadedFiles([]);
    }
  }, [conversationId]);

  const loadConversationFiles = async () => {
    if (!conversationId) return;
    const files = await getConversationFiles(conversationId);
    setUploadedFiles(files);
  };

  const generateTitle = (content: string): string => {
    const firstLine = content.split("\n")[0];
    return firstLine.length > 50 ? firstLine.substring(0, 50) + "..." : firstLine;
  };

  const handleSubmit = async (customPrompt?: string, customAction?: string) => {
    const messageContent = customPrompt || input.trim();
    if (!messageContent) return;

    let currentConversationId = conversationId;

    // Create new conversation if none exists
    if (!currentConversationId) {
      const title = generateTitle(messageContent);
      currentConversationId = await createConversation(title);
      
      if (!currentConversationId) {
        toast.error("Failed to create conversation");
        return;
      }
      
      onConversationCreated?.(currentConversationId);
    }

    // Save user message to database
    const userMsg = await addMessage("user", messageContent);
    if (!userMsg) return;

    setInput("");
    setLoading(true);

    // Determine action type
    const action = customAction || "session_summary";

    // Start streaming AI response
    let aiResponse = "";
    const streamingMessageId = `streaming-${Date.now()}`;
    
    // Add a temporary streaming message to display
    setDisplayMessages((prev) => [
      ...prev,
      {
        id: streamingMessageId,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
        isStreaming: true,
      },
    ]);

    try {
      await analyzeNotesStreaming({
        notes: messageContent,
        action: action as any,
        onChunk: (chunk) => {
          aiResponse += chunk;
          // Update the streaming message in real-time
          setDisplayMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMessageId
                ? { ...msg, content: aiResponse }
                : msg
            )
          );
        },
        onComplete: async () => {
          // Save complete AI response to database
          await addMessage("assistant", aiResponse);
          
          // Remove the temporary streaming message (it will be replaced by the DB message)
          setDisplayMessages((prev) =>
            prev.filter((msg) => msg.id !== streamingMessageId)
          );
          
          setLoading(false);
          toast.success("Analysis complete!");
        },
        onError: (error) => {
          console.error("Streaming error:", error);
          toast.error(error);
          
          // Remove the temporary streaming message
          setDisplayMessages((prev) =>
            prev.filter((msg) => msg.id !== streamingMessageId)
          );
          
          setLoading(false);
        },
      });
    } catch (error: any) {
      console.error("Error during analysis:", error);
      toast.error("Failed to analyze notes");
      
      // Remove the temporary streaming message
      setDisplayMessages((prev) =>
        prev.filter((msg) => msg.id !== streamingMessageId)
      );
      
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const actionMap: Record<string, string> = {
      soap: "soap_note",
      summary: "session_summary",
      keypoints: "key_points",
      progress: "progress_report",
    };

    const prompts: Record<string, string> = {
      soap: "Please generate a detailed SOAP note based on the session information provided.",
      summary: "Create a comprehensive session summary highlighting key therapeutic moments and client progress.",
      keypoints: "Extract and organize the most clinically significant points from this session.",
      progress: "Generate a detailed progress report documenting therapeutic gains and areas for continued focus.",
    };

    handleSubmit(prompts[action], actionMap[action]);
  };

  const handleFileSelect = async (file: File) => {
    let currentConversationId = conversationId;

    // Create conversation if none exists
    if (!currentConversationId) {
      const title = `Document Analysis: ${file.name}`;
      currentConversationId = await createConversation(title);
      
      if (!currentConversationId) {
        toast.error("Failed to create conversation");
        return;
      }
      
      onConversationCreated?.(currentConversationId);
    }

    try {
      toast.info("Processing file...");
      
      // Extract text from file
      const extractedText = await extractTextFromFile(file);
      
      // Upload file to storage
      const uploadResult = await uploadFileToStorage(file, currentConversationId);
      if (!uploadResult) return;

      // Determine file type
      const fileType = file.type === "application/pdf" ? "pdf" : "text";

      // Save file metadata
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
      console.error("Error processing file:", error);
      toast.error(error.message || "Failed to process file");
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const file = uploadedFiles.find((f) => f.id === fileId);
    if (!file) return;

    const filePath = file.file_url.split("/clinical-documents/")[1];
    const success = await deleteFile(fileId, filePath);
    if (success) {
      await loadConversationFiles();
    }
  };

  const handleAnalyzeFile = (content: string, fileName: string) => {
    const prompt = `Please analyze the following document content from "${fileName}":\n\n${content.substring(0, 3000)}${content.length > 3000 ? "..." : ""}`;
    handleSubmit(prompt, "session_summary");
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="space-y-4">
      {/* Messages Display */}
      <Card className="h-[500px] overflow-y-auto p-6 shadow-md border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="space-y-4">
          {displayMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex w-full animate-fade-in",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-3 shadow-sm transition-all",
                  message.role === "user"
                    ? "bg-primary/10 text-foreground border border-primary/20"
                    : "bg-card text-foreground border border-border"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.role === "assistant" && (
                    <Sparkles className="w-4 h-4 text-accent" />
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(message.created_at)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="max-w-[80%] rounded-lg px-4 py-3 bg-card border border-border shadow-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="w-4 h-4 text-accent animate-pulse" />
                  <span className="text-sm">Analyzing notes</span>
                  <span className="flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-4 shadow-sm border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-foreground">Quick Actions</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction("soap")}
            disabled={loading}
            className="transition-all hover:bg-primary/10 hover:border-primary/30"
          >
            <FileText className="w-4 h-4 mr-2" />
            SOAP Note
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction("summary")}
            disabled={loading}
            className="transition-all hover:bg-primary/10 hover:border-primary/30"
          >
            <FileText className="w-4 h-4 mr-2" />
            Session Summary
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction("keypoints")}
            disabled={loading}
            className="transition-all hover:bg-primary/10 hover:border-primary/30"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Key Points
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickAction("progress")}
            disabled={loading}
            className="transition-all hover:bg-primary/10 hover:border-primary/30"
          >
            <FileText className="w-4 h-4 mr-2" />
            Progress Report
          </Button>
        </div>
      </Card>

      {/* Uploaded Files */}
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
              onDelete={handleDeleteFile}
              onAnalyze={handleAnalyzeFile}
            />
          ))}
        </div>
      )}

      {/* File Upload Zone */}
      {showFileUpload && (
        <FileDropZone onFileSelect={handleFileSelect} disabled={loading} />
      )}

      {/* Input Area */}
      <Card className="p-4 shadow-md border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="space-y-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your session notes here...&#10;&#10;Include patient observations, session content, interventions used, and any notable behavioral or emotional changes..."
            className="min-h-[120px] resize-y transition-all focus:shadow-md"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                handleSubmit();
              }
            }}
          />

          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowFileUpload(!showFileUpload)}
                disabled={loading}
                className="transition-all"
              >
                <Paperclip className="w-4 h-4 mr-2" />
                {showFileUpload ? "Hide Upload" : "Upload Document"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setInput("")}
                disabled={loading || !input}
                className="transition-all"
              >
                Clear
              </Button>
            </div>

            <Button
              onClick={() => handleSubmit()}
              disabled={loading || !input.trim()}
              className="bg-primary hover:bg-primary/90 transition-all shadow-sm"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Analyze Notes
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Press Ctrl+Enter to submit • Upload PDF or text documents
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ChatInterface;
