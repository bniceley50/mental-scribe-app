import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";
import { EXAMPLE_PROMPTS } from "@/constants/examplePrompts";

interface ExamplePromptsProps {
  onSelectExample: (example: string) => void;
  disabled?: boolean;
}

export const ExamplePrompts = ({ onSelectExample, disabled }: ExamplePromptsProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lightbulb className="w-4 h-4" />
        <span>Try an example to get started:</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {EXAMPLE_PROMPTS.map((example) => {
          const Icon = example.icon;
          return (
            <Button
              key={example.label}
              variant="outline"
              className="h-auto py-3 px-4 justify-start text-left hover:bg-primary/5 hover:border-primary/30 transition-all"
              onClick={() => onSelectExample(example.prompt)}
              disabled={disabled}
            >
              <Icon className="w-4 h-4 mr-2 flex-shrink-0 text-primary" />
              <span className="text-sm">{example.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
