import { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Message as DBMessage } from "@/hooks/useMessages";
import { MessageActions, StreamingMessage } from "@/components/MessageActions";

interface MessageListProps {
  messages: Array<DBMessage & { isStreaming?: boolean }>;
  hasMore: boolean;
  onLoadMore: () => void;
  messagesLoading: boolean;
  conversationId: string | null;
  onRegenerate: () => void;
  onEditMessage: (message: DBMessage) => void;
}

export const MessageList = ({
  messages,
  hasMore,
  onLoadMore,
  messagesLoading,
  conversationId,
  onRegenerate,
  onEditMessage,
}: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (messages.length === 0) return null;

  return (
    <Card className="h-[500px] overflow-y-auto p-6 shadow-md border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="space-y-4">
        {hasMore && conversationId && (
          <div className="flex justify-center pb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              disabled={messagesLoading}
              className="hover:bg-primary/10"
              aria-live="polite"
            >
              {messagesLoading ? (
                <>Loading...</>
              ) : (
                <>Load older messages</>
              )}
            </Button>
          </div>
        )}

        {messages.map((message) => (
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
                    onRegenerate={message.isStreaming ? undefined : onRegenerate}
                    onEdit={() => onEditMessage(message)}
                    showEdit={!message.isStreaming}
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
  );
};
