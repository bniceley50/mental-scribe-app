import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Wand2, Loader2 } from "lucide-react";

interface EditMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalContent: string;
  onEdit: (instruction: string) => void;
  isLoading?: boolean;
}

export const EditMessageDialog = ({ 
  open, 
  onOpenChange, 
  originalContent,
  onEdit,
  isLoading = false 
}: EditMessageDialogProps) => {
  const [instruction, setInstruction] = useState("");

  const handleEdit = () => {
    if (instruction.trim()) {
      onEdit(instruction);
      setInstruction("");
    }
  };

  const exampleInstructions = [
    "Condense the subjective section",
    "Expand the assessment with more detail",
    "Make this more concise",
    "Rephrase in simpler language",
    "Add more clinical terminology"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Edit with AI
          </DialogTitle>
          <DialogDescription>
            Describe how you'd like to modify this content. The AI will preserve clinical accuracy while applying your changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Original Content</label>
            <div className="p-3 bg-muted rounded-md max-h-40 overflow-y-auto text-sm">
              {originalContent}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Edit Instruction</label>
            <Textarea
              placeholder="E.g., 'Condense this section' or 'Add more detail about the interventions used'"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="min-h-24"
              disabled={isLoading}
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Example instructions:</p>
            <div className="flex flex-wrap gap-2">
              {exampleInstructions.map((example, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => setInstruction(example)}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {example}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!instruction.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Editing...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Apply Edit
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
