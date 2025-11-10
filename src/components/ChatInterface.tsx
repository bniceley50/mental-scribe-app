import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Table } from "lucide-react";
import { toast as showToast } from "sonner";
import { logger } from "@/lib/logger";
import { useMessages, Message as DBMessage } from "@/hooks/useMessages";
import { useConversations } from "@/hooks/useConversations";
import { AdvancedAnalysis } from "./AdvancedAnalysis";
import { StructuredNoteForm } from "./StructuredNoteForm";
import { EditMessageDialog } from "./EditMessageDialog";
import {
  extractTextFromFile,
  uploadFileToStorage,
  saveFileMetadata,
  getConversationFiles,
  deleteFile,
} from "@/lib/fileUpload";
import { analyzeNotesStreaming } from "@/lib/openai";
import { exportConversationToPDF, exportConversationToText, copyConversationToClipboard } from "@/lib/exportUtils";
import { supabase } from "@/integrations/supabase/client";
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
import { ChatInput, ChatInputRef } from "./chat/ChatInput";
import { MessageList } from "./chat/MessageList";
import { ConversationHeader } from "./chat/ConversationHeader";
import { QuickActions } from "./chat/QuickActions";
import { FileManager } from "./chat/FileManager";

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
  const [isPart2Protected, setIsPart2Protected] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<DBMessage | null>(null);
  const chatInputRef = useRef<ChatInputRef>(null);
  
  const { messages: dbMessages, addMessage, hasMore, loadOlderMessages, loading: messagesLoading } = useMessages(conversationId);
  const { createConversation, conversations } = useConversations();

  const [displayMessages, setDisplayMessages] = useState<Array<DBMessage & { isStreaming?: boolean }>>([]);

  // Auto-save draft to sessionStorage
  useEffect(() => {
    if (input && !conversationId) {
      if (draftSaveTimeout) clearTimeout(draftSaveTimeout);
      const timeout = setTimeout(() => {
        sessionStorage.setItem("clinicalai_draft", input);
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
      const draft = sessionStorage.getItem("clinicalai_draft");
      if (draft) {
        setInput(draft);
      }
    }

    return () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          sessionStorage.removeItem("clinicalai_draft");
        }
      });
    };
  }, [conversationId]);

  useEffect(() => {
    if (dbMessages.length === 0 && !conversationId) {
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

  useEffect(() => {
    if (conversationId) {
      loadConversationFiles();
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

    setLastUserMessage(messageContent);
    setLastAction(customAction || "session_summary");

    let currentConversationId = conversationId;

    if (!currentConversationId) {
      const title = generateTitle(messageContent);
      currentConversationId = await createConversation(
        title, 
        isPart2Protected,
        selectedClientId
      );
      
      if (!currentConversationId) {
        showToast.error("Failed to create conversation");
        return;
      }
      
      onConversationCreated?.(currentConversationId);
      
      if (isPart2Protected) {
        showToast.info("Session marked as 42 CFR Part 2 protected", {
          description: "All access to this conversation will be audited"
        });
      }
    }

    const userMsg = await addMessage("user", messageContent, currentConversationId || conversationId || undefined);
    if (!userMsg) return;

    setInput("");
    setLoading(true);

    const controller = new AbortController();
    setAbortController(controller);

    const action = customAction || "session_summary";

    let aiResponse = "";
    const streamingMessageId = `streaming-${Date.now()}`;
    
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

    showToast.loading("Generating response...", {
      id: "streaming-toast",
      description: "AI is analyzing your notes"
    });

    try {
      await analyzeNotesStreaming({
        notes: messageContent,
        action: action as any,
        onChunk: (chunk) => {
          aiResponse += chunk;
          setDisplayMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMessageId
                ? { ...msg, content: aiResponse }
                : msg
            )
          );
        },
        onComplete: async () => {
          showToast.dismiss("streaming-toast");
          await addMessage("assistant", aiResponse, currentConversationId || conversationId || undefined);
          setDisplayMessages((prev) =>
            prev.filter((msg) => msg.id !== streamingMessageId)
          );
          setLoading(false);
          setAbortController(null);
          showToast.success("Analysis complete!", {
            description: `Generated ${aiResponse.length} characters`
          });
        },
        onError: (error) => {
          logger.error("Streaming error", new Error(error), { conversationId, action: lastAction });
          showToast.dismiss("streaming-toast");
          
          if (controller.signal.aborted) {
            showToast.info("Response generation stopped by user");
          } else {
            let errorMessage = "Failed to generate response. Please try again.";
            
            if (error.includes("rate limit") || error.includes("429")) {
              errorMessage = "Too many requests. Please wait a moment and try again.";
            } else if (error.includes("network") || error.includes("fetch")) {
              errorMessage = "Network connection issue. Please check your internet and try again.";
            } else if (error.includes("timeout")) {
              errorMessage = "Request timed out. Please try again with a shorter input.";
            } else if (error.includes("402") || error.includes("payment")) {
              errorMessage = "AI service temporarily unavailable. Please contact support.";
            }
            
            showToast.error(errorMessage, {
              description: "If this persists, please contact support.",
              duration: 5000
            });
          }
          
          setDisplayMessages((prev) =>
            prev.filter((msg) => msg.id !== streamingMessageId)
          );
          setLoading(false);
          setAbortController(null);
        },
      });

      controller.signal.addEventListener("abort", () => {});
    } catch (error: any) {
      logger.error("Error during analysis", error, { conversationId });
      showToast.error("Failed to analyze notes");
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

  const handleEditMessage = (message: DBMessage) => {
    setEditingMessage(message);
    setEditDialogOpen(true);
  };

  const handleApplyEdit = async (editInstruction: string) => {
    if (!editingMessage || !conversationId) return;

    setLoading(true);
    
    let editedContent = "";
    const streamingMessageId = `editing-${Date.now()}`;
    
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
        notes: "",
        action: "edit_content",
        originalContent: editingMessage.content,
        editInstruction: editInstruction,
        onChunk: (chunk) => {
          editedContent += chunk;
          setDisplayMessages((prev) =>
            prev.map((msg) =>
              msg.id === streamingMessageId
                ? { ...msg, content: editedContent }
                : msg
            )
          );
        },
        onComplete: async () => {
          await addMessage("assistant", editedContent, conversationId || undefined);
          setDisplayMessages((prev) =>
            prev.filter((msg) => msg.id !== streamingMessageId)
          );
          setLoading(false);
          setEditDialogOpen(false);
          setEditingMessage(null);
          showToast.success("Edit applied successfully!");
        },
        onError: (error) => {
          logger.error("Edit error", new Error(error), { messageId: editingMessage.id });
          showToast.error(error);
          setDisplayMessages((prev) =>
            prev.filter((msg) => msg.id !== streamingMessageId)
          );
          setLoading(false);
        },
      });
    } catch (error) {
      logger.error("Error applying edit", error as Error);
      showToast.error("Failed to apply edit");
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

    if (!currentConversationId) {
      const title = `Document Analysis: ${file.name}`;
      currentConversationId = await createConversation(
        title, 
        isPart2Protected,
        selectedClientId
      );
      
      if (!currentConversationId) {
        showToast.error("Failed to create conversation");
        return;
      }
      
      onConversationCreated?.(currentConversationId);
    }

    try {
      showToast.info("Processing file...");
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
        showToast.success("File uploaded successfully!");
        await loadConversationFiles();
        setShowFileUpload(false);
      }
    } catch (error: any) {
      logger.error("Error processing file", error, { fileName: file.name });
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
    sessionStorage.removeItem("clinicalai_draft");
  };

  const handleSelectTemplate = (template: string) => {
    setInput(template);
    sessionStorage.removeItem("clinicalai_draft");
  };

  const currentConversation = conversations.find(c => c.id === conversationId);

  return (
    <div className="space-y-4">
      <ConversationHeader
        conversationId={conversationId}
        conversationTitle={conversationTitle}
        messageCount={displayMessages.length}
        isPart2Protected={currentConversation?.is_part2_protected || false}
        part2ConsentStatus={currentConversation?.part2_consent_status}
        onExportPDF={handleExportPDF}
        onExportText={handleExportText}
        onCopyToClipboard={handleCopyToClipboard}
        onClearConversation={handleClearConversation}
      />

      <MessageList
        messages={displayMessages}
        hasMore={hasMore}
        onLoadMore={loadOlderMessages}
        messagesLoading={messagesLoading}
        conversationId={conversationId}
        onRegenerate={handleRegenerate}
        onEditMessage={handleEditMessage}
      />

      {displayMessages.some((m) => m.role === "assistant") && (
        <Card className="p-3 bg-amber-500/5 border-amber-500/20">
          <p className="text-xs text-muted-foreground text-center">
            ⚠️ <strong>Professional Review Required:</strong> All AI-generated clinical documentation
            must be reviewed and verified by a qualified healthcare professional before use.
          </p>
        </Card>
      )}

      <QuickActions
        onAction={handleQuickAction}
        onSelectTemplate={handleSelectTemplate}
        loading={loading}
      />

      <FileManager
        uploadedFiles={uploadedFiles}
        showFileUpload={showFileUpload}
        loading={loading}
        onFileSelect={handleFileSelect}
        onDeleteFile={handleDeleteFile}
        onAnalyzeFile={handleAnalyzeFile}
      />

      <Tabs defaultValue="freeform" className="w-full" data-onboarding="tabs">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="freeform" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Free-form Notes
          </TabsTrigger>
          <TabsTrigger value="structured" className="flex items-center gap-2">
            <Table className="w-4 h-4" />
            Structured Form
          </TabsTrigger>
        </TabsList>

        <TabsContent value="freeform">
          <ChatInput
            ref={chatInputRef}
            input={input}
            onInputChange={setInput}
            onSubmit={() => handleSubmit()}
            onClear={() => setInput("")}
            loading={loading}
            conversationId={conversationId}
            showExamples={!conversationId && displayMessages.length <= 1}
            onSelectExample={handleSelectExample}
            isPart2Protected={isPart2Protected}
            onPart2Change={setIsPart2Protected}
            selectedClientId={selectedClientId}
            onClientChange={setSelectedClientId}
            showFileUpload={showFileUpload}
            onToggleFileUpload={() => setShowFileUpload(!showFileUpload)}
            onStopGeneration={handleStopGeneration}
          />

          {input.trim() && (
            <div data-onboarding="advanced-analysis">
              <AdvancedAnalysis 
                noteContent={input} 
                conversationId={conversationId || "temp"} 
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="structured" data-onboarding="structured-form">
          {conversationId ? (
            <StructuredNoteForm conversationId={conversationId} />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                Please start a conversation first to use the structured note form.
              </p>
              <Button 
                onClick={() => handleSubmit("Started new session", "session_summary")}
                className="mt-4"
              >
                Start New Session
              </Button>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <EditMessageDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        originalContent={editingMessage?.content || ""}
        onEdit={handleApplyEdit}
        isLoading={loading}
      />

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
