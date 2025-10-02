import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, FileText, Sparkles, Upload, Clock, FileUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useMessages, Message as DBMessage } from "@/hooks/useMessages";
import { useConversations } from "@/hooks/useConversations";

interface ChatInterfaceProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}

const ChatInterface = ({ conversationId, onConversationCreated }: ChatInterfaceProps) => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const generateTitle = (content: string): string => {
    const firstLine = content.split("\n")[0];
    return firstLine.length > 50 ? firstLine.substring(0, 50) + "..." : firstLine;
  };

  const handleSubmit = async (customPrompt?: string) => {
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

    try {
      // TODO: Integrate with OpenAI API via edge function
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const aiResponse =
        "I've analyzed your notes. Here's a comprehensive clinical documentation:\n\n**SOAP Note:**\n\nSubjective: [Analysis coming soon]\n\nObjective: [Analysis coming soon]\n\nAssessment: [Analysis coming soon]\n\nPlan: [Analysis coming soon]";

      // Save AI response to database
      await addMessage("assistant", aiResponse);
      
      toast.success("Analysis complete!");
    } catch (error) {
      toast.error("Failed to analyze notes");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const prompts: Record<string, string> = {
      soap: "Please generate a detailed SOAP note based on the session information provided.",
      summary: "Create a comprehensive session summary highlighting key therapeutic moments and client progress.",
      keypoints: "Extract and organize the most clinically significant points from this session.",
      progress: "Generate a detailed progress report documenting therapeutic gains and areas for continued focus.",
    };
    handleSubmit(prompts[action]);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.type !== "text/plain" && !file.name.endsWith(".txt")) {
      toast.error("Please upload a text file (.txt)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setInput(content);
      toast.success("File loaded successfully");
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
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

      {/* Input Area */}
      <Card
        className={cn(
          "p-4 shadow-md border-border/50 bg-card/80 backdrop-blur-sm transition-all",
          isDragging && "border-primary border-2 bg-primary/5"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileUp className="w-4 h-4" />
            <span>Type your notes below or drag & drop a text file</span>
          </div>

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
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="transition-all"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload File
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
            Press Ctrl+Enter to submit • Supports .txt files
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ChatInterface;
