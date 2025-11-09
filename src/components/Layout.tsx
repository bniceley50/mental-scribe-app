import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Brain, FileText, History, Settings, LogOut, Shield, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast as showToast } from "sonner";
import { ConversationSidebar } from "./ConversationSidebar";
import { PrivacyFooter } from "./PrivacyFooter";
import { HelpDialog } from "./HelpDialog";
import { useAdminAccess } from "@/hooks/useAdminAccess";

interface LayoutProps {
  children: ReactNode;
  currentConversationId?: string | null;
  onConversationSelect?: (conversationId: string) => void;
}

const Layout = ({ children, currentConversationId, onConversationSelect }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAdminAccess();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try { sessionStorage.clear(); } catch { /* noop: best-effort cleanup */ }
    try { localStorage.clear(); } catch { /* noop: best-effort cleanup */ }
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast.error("Failed to log out");
    } else {
      showToast.success("Logged out successfully");
      navigate("/auth");
    }
  };

  const handleNewConversation = () => {
    if (onConversationSelect) {
      onConversationSelect("");
    }
    navigate("/");
  };

  const navItems = [
    { path: "/", icon: FileText, label: "New Analysis" },
    { path: "/clients", icon: Brain, label: "Clients" },
    { path: "/history", icon: History, label: "History" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  const adminNavItems = isAdmin ? [
    { path: "/security/audit", icon: Shield, label: "Audit Chain" },
    { path: "/security/compliance", icon: ClipboardCheck, label: "Compliance Reports" },
  ] : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50" role="banner">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center" aria-hidden="true">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">ClinicalAI Assistant</h1>
          </div>
          <div className="flex items-center gap-2">
            <div data-onboarding="help-button">
              <HelpDialog />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1" role="main">
        {/* Sidebar */}
        <aside className="w-80 border-r border-border bg-card/30 backdrop-blur-sm flex flex-col" role="complementary" aria-label="Navigation and conversations">
          <nav className="p-4 space-y-2 border-b border-border" aria-label="Main navigation">
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
            
            {/* Admin-only navigation items */}
            {adminNavItems.length > 0 && (
              <>
                <div className="pt-2 pb-1">
                  <p className="text-xs font-medium text-muted-foreground px-3">Admin</p>
                </div>
                {adminNavItems.map((item) => {
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
              </>
            )}
          </nav>

          {/* Conversation Sidebar */}
          <div className="flex-1 overflow-hidden">
            <ConversationSidebar
              currentConversationId={currentConversationId}
              onConversationSelect={onConversationSelect}
              onNewConversation={handleNewConversation}
            />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-8 bg-gradient-to-b from-background to-secondary/20">
            {children}
          </main>
          <PrivacyFooter />
        </div>
      </div>
    </div>
  );
};

export default Layout;
