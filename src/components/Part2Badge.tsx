import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Part2BadgeProps {
  consentStatus?: string;
  size?: "sm" | "default";
}

export const Part2Badge = ({ consentStatus = "none", size = "default" }: Part2BadgeProps) => {
  const getStatusColor = () => {
    switch (consentStatus) {
      case "obtained":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "expired":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "revoked":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-purple-500/10 text-purple-600 border-purple-500/20";
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

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`${getStatusColor()} flex items-center gap-1 ${size === "sm" ? "text-xs px-1.5 py-0.5" : ""}`}
          >
            <Shield className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
            {getStatusText()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};