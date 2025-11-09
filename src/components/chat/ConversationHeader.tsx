import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Copy, Trash2 } from "lucide-react";
import { Part2Badge } from "@/components/Part2Badge";

interface ConversationHeaderProps {
  conversationId: string | null;
  conversationTitle: string;
  messageCount: number;
  isPart2Protected: boolean;
  part2ConsentStatus?: string;
  onExportPDF: () => void;
  onExportText: () => void;
  onCopyToClipboard: () => void;
  onClearConversation: () => void;
}

export const ConversationHeader = ({
  conversationId,
  conversationTitle,
  messageCount,
  isPart2Protected,
  part2ConsentStatus,
  onExportPDF,
  onExportText,
  onCopyToClipboard,
  onClearConversation,
}: ConversationHeaderProps) => {
  if (!conversationId || messageCount <= 1) return null;

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-medium text-foreground">{conversationTitle}</h3>
        {isPart2Protected && (
          <Part2Badge consentStatus={part2ConsentStatus} />
        )}
      </div>
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportPDF}>
              <FileText className="w-4 h-4 mr-2" />
              Download as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportText}>
              <FileText className="w-4 h-4 mr-2" />
              Download as Text
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCopyToClipboard}>
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={onClearConversation}
          className="hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Conversation
        </Button>
      </div>
    </div>
  );
};
