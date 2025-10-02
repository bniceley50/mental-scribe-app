import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Brain, FileText, History, Settings, LogOut, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useConversations } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  currentConversationId?: string | null;
  onConversationSelect?: (conversationId: string) => void;
}

const Layout = ({ children, currentConversationId, onConversationSelect }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { conversations, loading, deleteConversation } = useConversations();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to log out");
    } else {
      toast.success("Logged out successfully");
      navigate("/auth");
    }
  };

  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this conversation?")) {
      await deleteConversation(conversationId);
      if (currentConversationId === conversationId && onConversationSelect) {
        onConversationSelect("");
      }
    }
  };

  const navItems = [
    { path: "/", icon: FileText, label: "New Analysis" },
    { path: "/history", icon: History, label: "History" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">ClinicalAI Assistant</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-73px)] border-r border-border bg-card/30 backdrop-blur-sm flex flex-col">
          <nav className="p-4 space-y-2 border-b border-border">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={isActive(item.path) ? "secondary" : "ghost"}
                    className={`w-full justify-start transition-all ${
                      isActive(item.path)
                        ? "bg-secondary text-sidebar-accent-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Recent Conversations */}
          <div className="flex-1 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Recent Conversations</h3>
            </div>

            <ScrollArea className="h-[calc(100vh-320px)]">
              {loading ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Loading...
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No conversations yet
                </div>
              ) : (
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all text-sm",
                        currentConversationId === conv.id
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                      )}
                      onClick={() => onConversationSelect?.(conv.id)}
                    >
                      <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{conv.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-gradient-to-b from-background to-secondary/20">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
