import { useState } from "react";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Part2ConsentDialog from "./Part2ConsentDialog";
import Part2ConsentManager from "./Part2ConsentManager";

interface Part2BadgeProps {
  conversationId: string;
  consentStatus?: string;
  size?: "sm" | "default";
}

export const Part2Badge = ({ conversationId, consentStatus = "none", size = "default" }: Part2BadgeProps) => {
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [showManagerDialog, setShowManagerDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("grant");
  const getStatusColor = () => {
    switch (consentStatus) {
      case "obtained":
        return "bg-accent/10 text-accent-foreground border-accent/20";
      case "expired":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "revoked":
        return "bg-destructive/10 text-destructive-foreground border-destructive/20";
      default:
        return "bg-primary/10 text-primary-foreground border-primary/20";
    }
  };

  const getStatusText = () => {
    switch (consentStatus) {
      case "obtained":
        return "Part 2 • Consent ✓";
      case "expired":
        return "Part 2 • Expired";
      case "revoked":
        return "Part 2 • Revoked";
      default:
        return "Part 2 Protected";
    }
  };

  const getTooltipText = () => {
    return "This record contains substance use disorder (SUD) information protected under 42 CFR Part 2";
  };

  const handleConsentGranted = () => {
    setShowConsentDialog(false);
    setShowManagerDialog(false);
    // Trigger a refresh if needed
  };

  const openManagement = () => {
    setActiveTab("manage");
    setShowManagerDialog(true);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={openManagement}
              className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
            >
              <Badge 
                variant="outline" 
                className={`${getStatusColor()} flex items-center gap-1 ${size === "sm" ? "text-xs px-1.5 py-0.5" : ""} cursor-pointer hover:opacity-80 transition-opacity`}
              >
                <Shield className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
                {getStatusText()}
              </Badge>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{getTooltipText()}</p>
            <p className="text-xs font-semibold mt-1">Click to manage consents</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Consent Management Dialog */}
      <Dialog open={showManagerDialog} onOpenChange={setShowManagerDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Part 2 Consent Management
            </DialogTitle>
            <DialogDescription>
              Manage 42 CFR Part 2 consents for substance use disorder information disclosure
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="grant">Grant Consent</TabsTrigger>
              <TabsTrigger value="manage">Manage Consents</TabsTrigger>
            </TabsList>
            
            <TabsContent value="grant" className="space-y-4">
              <Button 
                onClick={() => {
                  setShowManagerDialog(false);
                  setShowConsentDialog(true);
                }}
                className="w-full"
              >
                <Shield className="w-4 h-4 mr-2" />
                Grant New Consent
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Click above to create a new Part 2 consent for this conversation
              </p>
            </TabsContent>
            
            <TabsContent value="manage">
              <Part2ConsentManager
                conversationId={conversationId}
                onConsentChange={handleConsentGranted}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Consent Creation Dialog */}
      <Part2ConsentDialog
        conversationId={conversationId}
        open={showConsentDialog}
        onClose={() => setShowConsentDialog(false)}
        onConsentGranted={handleConsentGranted}
      />
    </>
  );
};