import { useState, useMemo } from "react";
import { MessageSquare, Trash2, Search, Plus, Download, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useConversations } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { exportConversationToPDF } from "@/lib/exportUtils";
import { formatDistanceToNow } from "date-fns";
import { Part2Badge } from "@/components/Part2Badge";
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

interface ConversationSidebarProps {
  currentConversationId?: string | null;
  onConversationSelect?: (conversationId: string) => void;
  onNewConversation?: () => void;
}

export const ConversationSidebar = ({
  currentConversationId,
  onConversationSelect,
  onNewConversation,
}: ConversationSidebarProps) => {
  const { conversations, loading, deleteConversation, hasMore, loadMore } = useConversations();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    const filtered = conversations.filter((conv) =>
      conv.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    return {
      today: filtered.filter((c) => new Date(c.updated_at) >= today),
      yesterday: filtered.filter(
        (c) => new Date(c.updated_at) >= yesterday && new Date(c.updated_at) < today
      ),
      thisWeek: filtered.filter(
        (c) => new Date(c.updated_at) >= weekAgo && new Date(c.updated_at) < yesterday
      ),
      older: filtered.filter((c) => new Date(c.updated_at) < weekAgo),
    };
  }, [conversations, searchQuery]);

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (conversationToDelete) {
      await deleteConversation(conversationToDelete);
      if (currentConversationId === conversationToDelete && onConversationSelect) {
        onConversationSelect("");
      }
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const handleExportClick = async (e: React.MouseEvent, conversationId: string, title: string) => {
    e.stopPropagation();
    await exportConversationToPDF(conversationId, title);
  };

  const ConversationGroup = ({ title, conversations }: { title: string; conversations: any[] }) => {
    if (conversations.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2 px-2">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </h4>
          <span className="text-xs text-muted-foreground">({conversations.length})</span>
        </div>
        <div className="space-y-1">
          {conversations.map((conv) => (
            <ConversationItem key={conv.id} conversation={conv} />
          ))}
        </div>
      </div>
    );
  };

  const ConversationItem = ({ conversation }: { conversation: any }) => {
    const { messages } = useMessages(conversation.id);
    const lastMessage = messages[messages.length - 1];

    return (
      <div
        className={cn(
          "group relative flex flex-col gap-1 p-3 rounded-lg cursor-pointer transition-all",
          currentConversationId === conversation.id
            ? "bg-primary/10 border border-primary/20"
            : "hover:bg-secondary/50 border border-transparent"
        )}
        onClick={() => onConversationSelect?.(conversation.id)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">
                  {conversation.title}
                </p>
                {conversation.is_part2_protected && (
                  <Part2Badge consentStatus={conversation.part2_consent_status} size="sm" />
                )}
              </div>
              {lastMessage && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {lastMessage.content.substring(0, 50)}...
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-primary/10"
              onClick={(e) => handleExportClick(e, conversation.id, conversation.title)}
              title="Export to PDF"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={(e) => handleDeleteClick(e, conversation.id)}
              title="Delete conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-6">
          <span>{formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}</span>
          {messages.length > 0 && (
            <>
              <span>•</span>
              <span>{messages.length} messages</span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full p-4">
        {/* New Conversation Button */}
        <Button
          onClick={onNewConversation}
          className="w-full mb-4 bg-primary hover:bg-primary/90 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Conversation
        </Button>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>

        <Separator className="mb-4" />

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-8">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No conversations yet</p>
              <p className="text-xs mt-1">Start a new conversation to get started</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <ConversationGroup title="Today" conversations={groupedConversations.today} />
                <ConversationGroup title="Yesterday" conversations={groupedConversations.yesterday} />
                <ConversationGroup title="This Week" conversations={groupedConversations.thisWeek} />
                <ConversationGroup title="Older" conversations={groupedConversations.older} />
              </div>
              
              {/* Load More Button */}
              {hasMore && (
                <div className="mt-4 px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMore}
                    className="w-full"
                    disabled={loading}
                  >
                    Load more conversations...
                  </Button>
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the conversation and all
              associated messages and files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
