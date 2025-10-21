import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, BookTemplate, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast as showToast } from "sonner";
import { NOTE_TEMPLATES, Template } from "@/constants/noteTemplates";

interface NoteTemplatesProps {
  onSelectTemplate: (content: string) => void;
}

export const NoteTemplates = React.forwardRef<HTMLButtonElement, NoteTemplatesProps>(
  ({ onSelectTemplate }, ref) => {
  const [open, setOpen] = useState(false);

  const handleCopyTemplate = (template: Template) => {
    navigator.clipboard.writeText(template.content);
    showToast.success(`Template "${template.name}" copied to clipboard!`);
  };

  const handleUseTemplate = (template: Template) => {
    onSelectTemplate(template.content);
    setOpen(false);
    showToast.success(`Template "${template.name}" loaded!`);
  };

  const categories = Array.from(new Set(NOTE_TEMPLATES.map((t) => t.category)));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button ref={ref} variant="outline" size="sm">
          <BookTemplate className="w-4 h-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookTemplate className="w-5 h-5 text-primary" />
            Note Templates Library
          </DialogTitle>
          <DialogDescription>
            Choose from professional templates to structure your clinical notes
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-foreground mb-3">{category}</h3>
                <div className="grid gap-3">
                  {NOTE_TEMPLATES
                    .filter((t) => t.category === category)
                    .map((template) => (
                      <Card key={template.id} className="p-4 hover:bg-secondary/30 transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground mb-1">
                              {template.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {template.description}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyTemplate(template)}
                              title="Copy to clipboard"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleUseTemplate(template)}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Use Template
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});
NoteTemplates.displayName = "NoteTemplates";
