import { Badge } from "@/components/ui/badge";
import { Lock, Wifi, WifiOff } from "lucide-react";
import { getNetworkStatusBadge, getProcessingMode } from "@/core/network/guard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function LocalModeBadge() {
  const mode = getProcessingMode();
  const badge = getNetworkStatusBadge();
  
  const getIcon = () => {
    if (mode === "local-browser") return <Lock className="w-3 h-3" />;
    if (mode === "local-lan") return <WifiOff className="w-3 h-3" />;
    return <Wifi className="w-3 h-3" />;
  };
  
  const getDescription = () => {
    if (mode === "local-browser") {
      return "All processing happens on your device. No data leaves your browser. PHI is encrypted at rest.";
    }
    if (mode === "local-lan") {
      return "Processing uses your local network server. No data goes to the cloud.";
    }
    return "Connected to cloud services for processing and storage.";
  };
  
  // Map badge variant to Badge component variants
  const mappedVariant: "default" | "secondary" | "destructive" | "outline" = 
    badge.variant === "success" ? "default" :
    badge.variant === "warning" ? "secondary" :
    "destructive";
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={mappedVariant} 
            className="flex items-center gap-1.5 cursor-help"
          >
            {getIcon()}
            <span className="text-xs font-medium">{badge.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">{getDescription()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
