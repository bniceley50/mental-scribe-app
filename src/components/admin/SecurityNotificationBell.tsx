import { Bell, XCircle, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSecurityAlerts } from '@/hooks/useSecurityAlerts';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function SecurityNotificationBell() {
  const { alerts, unreadCount, isLoading, markAllAsRead, clearAlert } = useSecurityAlerts();
  const navigate = useNavigate();

  const handleViewAuditDashboard = () => {
    navigate('/security/alerts');
    markAllAsRead();
  };

  const handleClearAlert = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    clearAlert(id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Security notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Security Alerts
          </span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs"
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-4 text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm font-medium">All Clear</p>
            <p className="text-xs text-muted-foreground mt-1">
              No security alerts detected
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {alerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className="flex flex-col items-start p-3 cursor-pointer hover:bg-destructive/10"
                onClick={handleViewAuditDashboard}
              >
                <div className="flex items-start gap-2 w-full">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-destructive">
                      Audit Chain Breach
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(alert.run_at), { addSuffix: true })}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-muted-foreground">
                        {alert.verified_entries}/{alert.total_entries} verified
                      </span>
                      {alert.broken_at_id && (
                        <span className="font-mono text-destructive">
                          Break: {alert.broken_at_id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => handleClearAlert(e, alert.id)}
                    aria-label="Clear alert"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}

        {alerts.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center font-medium text-primary cursor-pointer"
              onClick={handleViewAuditDashboard}
            >
              View Alert History →
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
