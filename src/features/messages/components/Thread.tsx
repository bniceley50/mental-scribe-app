import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { fetchMessagesPage, MessageDTO } from "../api/fetchMessages";
import { dedupeById, sortByCreatedAtAsc } from "@/lib/pagination";
import { Clock, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { StreamingMessage } from "@/components/MessageActions";

interface ThreadProps {
  conversationId: string;
}

export function Thread({ conversationId }: ThreadProps) {
  const [pages, setPages] = useState<MessageDTO[][]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState("");
  const liveRef = useRef<HTMLDivElement>(null);

  const allMessages = useMemo(() => {
    const flattened: MessageDTO[] = pages.flat();
    return sortByCreatedAtAsc<MessageDTO>(dedupeById<MessageDTO>(flattened));
  }, [pages]);

  const oldest = allMessages[0]?.created_at;

  const loadInitial = async () => {
    setLoading(true);
    setStatus("Loading messages…");
    const { data, error } = await fetchMessagesPage({ conversationId });
    if (error) {
      setStatus("Failed to load messages");
    } else {
      setPages(data.length ? [data] : []);
      setHasMore(data.length > 0 && data.length >= 30);
      setStatus(data.length ? "Loaded messages" : "No messages yet");
    }
    setLoading(false);
  };

  const loadOlder = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setStatus("Loading older messages…");
    const { data, error } = await fetchMessagesPage({ conversationId, before: oldest });
    if (error) {
      setStatus("Failed to load older messages");
    } else {
      if (data.length === 0) setHasMore(false);
      setPages((prev) => (data.length ? [...prev, data] : prev));
      setStatus(data.length ? `Loaded ${data.length} older messages` : "No more messages");
    }
    setLoading(false);
  };

  useEffect(() => {
    setPages([]);
    setHasMore(true);
    if (conversationId) {
      loadInitial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (status && liveRef.current) {
      liveRef.current.textContent = status;
    }
  }, [status]);

  if (!conversationId) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="sr-only" aria-live="polite" aria-atomic="true" ref={liveRef} />

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loading}>
            {loading ? "Loading…" : "Load older"}
          </Button>
        </div>
      )}

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-6">
          {allMessages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "flex w-full",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-5 py-4 shadow-sm border transition-all",
                  message.role === "user"
                    ? "bg-primary/5 border-primary/20"
                    : "bg-card border-border"
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">
                      {message.role === "user" ? "You" : "AI Assistant"}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(message.created_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                      <span className="mx-1">•</span>
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </div>

                {message.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none">
                    <StreamingMessage content={message.content} isStreaming={false} />
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                    {message.content}
                  </p>
                )}

                {index === 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">First message in conversation</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default Thread;
