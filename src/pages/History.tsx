import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Download, Copy, FileText, MessageSquare } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { useConversations } from "@/hooks/useConversations";
import { exportConversationToPDF, exportConversationToText, copyConversationToClipboard } from "@/lib/exportUtils";
import { StreamingMessage } from "@/components/MessageActions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Thread from "@/features/messages/components/Thread";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const History = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { messages } = useMessages(selectedConversationId);
  const { conversations } = useConversations();
  const [conversationTitle, setConversationTitle] = useState<string>("");

  useEffect(() => {
    if (selectedConversationId) {
      const conversation = conversations.find((c) => c.id === selectedConversationId);
      if (conversation) {
        setConversationTitle(conversation.title);
      }
    }
  }, [selectedConversationId, conversations]);

  const handleExportPDF = async () => {
    if (!selectedConversationId) return;
    await exportConversationToPDF(selectedConversationId, conversationTitle || "Conversation");
  };

  const handleExportText = async () => {
    if (!selectedConversationId) return;
    await exportConversationToText(selectedConversationId, conversationTitle || "Conversation");
  };

  const handleCopyToClipboard = async () => {
    if (!selectedConversationId) return;
    await copyConversationToClipboard(selectedConversationId, conversationTitle || "Conversation");
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
    <Layout
      currentConversationId={selectedConversationId}
      onConversationSelect={setSelectedConversationId}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-foreground mb-2">Analysis History</h2>
            <p className="text-muted-foreground">View and export your clinical note analyses</p>
          </div>

          {selectedConversationId && messages.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Conversation
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
          )}
        </div>

        <Card className="shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              {selectedConversationId ? conversationTitle : "Conversation History"}
            </CardTitle>
            <CardDescription>
              {selectedConversationId
                ? `${messages.length} messages in this conversation`
                : "Select a conversation from the sidebar to view its history"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedConversationId ? (
              <div className="text-center py-16 text-muted-foreground">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">No conversation selected</p>
                <p className="text-sm">
                  Choose a conversation from the sidebar to view its complete history
                </p>
                <p className="text-sm mt-4 text-primary">
                  💡 Tip: All your conversations are automatically saved
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No messages in this conversation</p>
              </div>
            ) : (
              selectedConversationId && (
                <Thread conversationId={selectedConversationId} />
              )
            )}
          </CardContent>
        </Card>

        {selectedConversationId && messages.length > 0 && (
          <Card className="shadow-sm border-border/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Conversation Summary
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {messages.length} total messages •{" "}
                      {messages.filter((m) => m.role === "assistant").length} AI responses
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All
                  </Button>
                  <Button variant="default" size="sm" onClick={handleExportPDF}>
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default History;
