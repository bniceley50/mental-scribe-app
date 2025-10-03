import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, FileText, Sparkles, Clock, Paperclip, StopCircle, Download, Copy, Trash2, BookTemplate, Save } from "lucide-react";
import { toast as showToast } from "sonner";
import { cn } from "@/lib/utils";
import { useMessages, Message as DBMessage } from "@/hooks/useMessages";
import { useConversations } from "@/hooks/useConversations";
import { FileDropZone } from "./FileDropZone";
import { FilePreview } from "./FilePreview";
import { MessageActions, StreamingMessage } from "./MessageActions";
import { ExamplePrompts } from "./ExamplePrompts";
import { NoteTemplates } from "./NoteTemplates";
import { AdvancedAnalysis } from "./AdvancedAnalysis";
import {
  extractTextFromFile,
  uploadFileToStorage,
  saveFileMetadata,
  getConversationFiles,
  deleteFile,
} from "@/lib/fileUpload";
import { analyzeNotesStreaming } from "@/lib/openai";
import { exportConversationToPDF, exportConversationToText, copyConversationToClipboard } from "@/lib/exportUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>("");
  const [lastAction, setLastAction] = useState<string>("session_summary");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [conversationTitle, setConversationTitle] = useState<string>("");
  const [draftSaveTimeout, setDraftSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { messages: dbMessages, addMessage } = useMessages(conversationId);
  const { createConversation, conversations } = useConversations();

  const [displayMessages, setDisplayMessages] = useState<Array<DBMessage & { isStreaming?: boolean }>>([]);

  // Auto-save draft
  useEffect(() => {
    if (input && !conversationId) {
      if (draftSaveTimeout) clearTimeout(draftSaveTimeout);
      const timeout = setTimeout(() => {
        localStorage.setItem("clinicalai_draft", input);
      }, 1000);
      setDraftSaveTimeout(timeout);
    }
    return () => {
      if (draftSaveTimeout) clearTimeout(draftSaveTimeout);
    };
  }, [input, conversationId]);

  // Load draft on mount
  useEffect(() => {
    if (!conversationId) {
      const draft = localStorage.getItem("clinicalai_draft");
      if (draft) {
        setInput(draft);
      }
    }
  }, [conversationId]);

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
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);

  useEffect(() => {
    if (conversationId) {
      loadConversationFiles();
      // Load conversation title
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        setConversationTitle(conversation.title);
      }
    } else {
      setUploadedFiles([]);
      setConversationTitle("");
    }
  }, [conversationId, conversations]);

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

    // Store for regeneration
    setLastUserMessage(messageContent);
    setLastAction(customAction || "session_summary");

    let currentConversationId = conversationId;

    // Create new conversation if none exists
    if (!currentConversationId) {
      const title = generateTitle(messageContent);
      currentConversationId = await createConversation(title);
      
      if (!currentConversationId) {
        showToast.error("Failed to create conversation");
        return;
      }
      
      onConversationCreated?.(currentConversationId);
    }

    // Save user message to database
    const userMsg = await addMessage("user", messageContent);
    if (!userMsg) return;

    setInput("");
    setLoading(true);

    // Create abort controller for stopping generation
    const controller = new AbortController();
    setAbortController(controller);

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
          setAbortController(null);
          showToast.success("Analysis complete!");
        },
        onError: (error) => {
          console.error("Streaming error:", error);
          
          // Check if it was user-initiated abort
          if (controller.signal.aborted) {
            showToast.info("Generation stopped");
          } else {
            showToast.error(error);
          }
          
          // Remove the temporary streaming message
          setDisplayMessages((prev) =>
            prev.filter((msg) => msg.id !== streamingMessageId)
          );
          
          setLoading(false);
          setAbortController(null);
        },
      });

      // Handle abort signal
      controller.signal.addEventListener("abort", () => {
        // The onError callback will handle cleanup
      });
    } catch (error: any) {
      console.error("Error during analysis:", error);
      showToast.error("Failed to analyze notes");
      
      // Remove the temporary streaming message
      setDisplayMessages((prev) =>
        prev.filter((msg) => msg.id !== streamingMessageId)
      );
      
      setLoading(false);
      setAbortController(null);
    }
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (lastUserMessage) {
      handleSubmit(lastUserMessage, lastAction);
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
        showToast.error("Failed to create conversation");
        return;
      }
      
      onConversationCreated?.(currentConversationId);
    }

    try {
      showToast.info("Processing file...");
      
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
        showToast.success("File uploaded successfully!");
        await loadConversationFiles();
        setShowFileUpload(false);
      }
    } catch (error: any) {
      console.error("Error processing file:", error);
      showToast.error(error.message || "Failed to process file");
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

  const handleClearConversation = () => {
    setClearDialogOpen(true);
  };

  const handleConfirmClear = () => {
    if (onConversationCreated) {
      onConversationCreated("");
    }
    setClearDialogOpen(false);
    showToast.success("Started new conversation");
  };

  const handleExportPDF = async () => {
    if (!conversationId) {
      showToast.error("No conversation to export");
      return;
    }
    await exportConversationToPDF(conversationId, conversationTitle || "Conversation");
  };

  const handleExportText = async () => {
    if (!conversationId) {
      showToast.error("No conversation to export");
      return;
    }
    await exportConversationToText(conversationId, conversationTitle || "Conversation");
  };

  const handleCopyToClipboard = async () => {
    if (!conversationId) {
      showToast.error("No conversation to copy");
      return;
    }
    await copyConversationToClipboard(conversationId, conversationTitle || "Conversation");
  };

  const handleSelectExample = (example: string) => {
    setInput(example);
    localStorage.removeItem("clinicalai_draft");
  };

  const handleSelectTemplate = (template: string) => {
    setInput(template);
    localStorage.removeItem("clinicalai_draft");
  };

  const wordCount = input.trim().split(/\s+/).filter(Boolean).length;
  const charCount = input.length;
  const estimatedTime = wordCount > 0 ? Math.max(5, Math.ceil(wordCount / 50)) : 0;

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
      {/* Conversation Actions */}
      {conversationId && displayMessages.length > 1 && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-foreground">{conversationTitle}</h3>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportText}>
                  <FileText className="w-4 h-4 mr-2" />
                  Download as Text
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCopyToClipboard}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={handleClearConversation}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Conversation
            </Button>
          </div>
        </div>
      )}

      {/* Messages Display */}
      <Card className="h-[500px] overflow-y-auto p-6 shadow-md border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="space-y-4">
          {displayMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex w-full",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-3 shadow-sm transition-all animate-fade-in",
                  message.role === "user"
                    ? "bg-primary/10 text-foreground border border-primary/20"
                    : "bg-card text-foreground border border-border"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {message.role === "assistant" && (
                    <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(message.created_at)}
                  </span>
                </div>

                {message.role === "assistant" ? (
                  <>
                    <StreamingMessage
                      content={message.content}
                      isStreaming={message.isStreaming || false}
                    />
                    <MessageActions
                      content={message.content}
                      isStreaming={message.isStreaming}
                      onRegenerate={message.isStreaming ? undefined : handleRegenerate}
                    />
                  </>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Disclaimer */}
      {displayMessages.some((m) => m.role === "assistant") && (
        <Card className="p-3 bg-amber-500/5 border-amber-500/20">
          <p className="text-xs text-muted-foreground text-center">
            ⚠️ <strong>Professional Review Required:</strong> All AI-generated clinical documentation
            must be reviewed and verified by a qualified healthcare professional before use.
          </p>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-4 shadow-sm border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-foreground">Quick Actions</span>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <NoteTemplates onSelectTemplate={handleSelectTemplate} />
              </TooltipTrigger>
              <TooltipContent>
                <p>Access pre-formatted note templates</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate structured SOAP note</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                <p>Create comprehensive session summary</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                <p>Extract key clinical insights</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate detailed progress report</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
      <Card className="p-4 shadow-md border-border/50 bg-card/80 backdrop-blur-sm" onClick={() => inputRef.current?.focus()}>
        <div className="space-y-3">
          {/* Example Prompts - Show when no conversation exists */}
          {!conversationId && displayMessages.length <= 1 && (
            <ExamplePrompts onSelectExample={handleSelectExample} disabled={loading} />
          )}

          <Textarea
            ref={inputRef}
            autoFocus
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

          {/* Character/Word Count and Estimated Time */}
          {input && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>{charCount} characters</span>
                <span>•</span>
                <span>{wordCount} words</span>
                {estimatedTime > 0 && (
                  <>
                    <span>•</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            ~{estimatedTime}s processing time
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Estimated time based on content length</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </>
                )}
              </div>
              {!conversationId && (
                <Badge variant="secondary" className="text-xs">
                  <Save className="w-3 h-3 mr-1" />
                  Draft auto-saved
                </Badge>
              )}
            </div>
          )}

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

            {loading && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleStopGeneration}
                className="ml-2"
                data-testid="stop-generation"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Stop
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
            <kbd className="px-2 py-0.5 bg-secondary rounded text-xs">Ctrl+Enter</kbd>
            to submit • Upload PDF or text documents for analysis
          </p>
        </div>
      </Card>

      {/* Advanced Analysis Section */}
      {input.trim() && (
        <AdvancedAnalysis 
          noteContent={input} 
          conversationId={conversationId || "temp"} 
        />
      )}

      {/* Clear Conversation Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will start a new conversation. Your current conversation will be saved in the
              history sidebar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClear}>
              Start New Conversation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatInterface;
