import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText, Sparkles } from "lucide-react";
import { NoteTemplates } from "@/components/NoteTemplates";

interface QuickActionsProps {
  onAction: (action: string) => void;
  onSelectTemplate: (template: string) => void;
  loading: boolean;
}

export const QuickActions = ({ onAction, onSelectTemplate, loading }: QuickActionsProps) => {
  return (
    <Card className="p-4 shadow-sm border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-foreground">Quick Actions</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <NoteTemplates onSelectTemplate={onSelectTemplate} />
            </TooltipTrigger>
            <TooltipContent>
              <p>Access pre-formatted note templates</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction("soap")}
                disabled={loading}
                className="transition-all hover:bg-primary/10 hover:border-primary/30"
              >
                <FileText className="w-4 h-4 mr-2" />
                SOAP Note
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Generate structured SOAP note</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction("summary")}
                disabled={loading}
                className="transition-all hover:bg-primary/10 hover:border-primary/30"
              >
                <FileText className="w-4 h-4 mr-2" />
                Session Summary
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create comprehensive session summary</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction("keypoints")}
                disabled={loading}
                className="transition-all hover:bg-primary/10 hover:border-primary/30"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Key Points
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Extract key clinical insights</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAction("progress")}
                disabled={loading}
                className="transition-all hover:bg-primary/10 hover:border-primary/30"
              >
                <FileText className="w-4 h-4 mr-2" />
                Progress Report
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Generate detailed progress report</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </Card>
  );
};
