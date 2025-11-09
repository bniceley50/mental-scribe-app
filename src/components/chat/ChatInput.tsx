import { useRef, forwardRef, useImperativeHandle } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, Paperclip, Sparkles, Clock, Save, Shield, StopCircle } from "lucide-react";
import { VoiceInput } from "@/components/VoiceInput";
import { SpeakButton } from "@/components/SpeakButton";
import { ExamplePrompts } from "@/components/ExamplePrompts";
import { ClientSelector } from "@/components/clients/ClientSelector";

interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  loading: boolean;
  conversationId: string | null;
  showExamples: boolean;
  onSelectExample: (example: string) => void;
  isPart2Protected: boolean;
  onPart2Change: (checked: boolean) => void;
  selectedClientId: string;
  onClientChange: (clientId: string) => void;
  showFileUpload: boolean;
  onToggleFileUpload: () => void;
  onStopGeneration: () => void;
}

export interface ChatInputRef {
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(({
  input,
  onInputChange,
  onSubmit,
  onClear,
  loading,
  conversationId,
  showExamples,
  onSelectExample,
  isPart2Protected,
  onPart2Change,
  selectedClientId,
  onClientChange,
  showFileUpload,
  onToggleFileUpload,
  onStopGeneration,
}, ref) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus()
  }));

  const wordCount = input.trim().split(/\s+/).filter(Boolean).length;
  const charCount = input.length;
  const estimatedTime = wordCount > 0 ? Math.max(5, Math.ceil(wordCount / 50)) : 0;

  return (
    <Card className="p-4 shadow-md border-border/50 bg-card/80 backdrop-blur-sm" onClick={() => inputRef.current?.focus()}>
      <div className="space-y-3">
        {showExamples && (
          <ExamplePrompts onSelectExample={onSelectExample} disabled={loading} />
        )}

        <Textarea
          ref={inputRef}
          autoFocus
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Enter your session notes here...&#10;&#10;Include patient observations, session content, interventions used, and any notable behavioral or emotional changes..."
          className="min-h-[120px] resize-y transition-all focus:shadow-md"
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              onSubmit();
            }
          }}
        />

        {input && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{charCount} characters</span>
              <span>•</span>
              <span>{wordCount} words</span>
              {estimatedTime > 0 && (
                <>
                  <span>•</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~{estimatedTime}s processing time
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Estimated time based on content length</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
            {!conversationId && (
              <Badge variant="secondary" className="text-xs">
                <Save className="w-3 h-3 mr-1" />
                Draft auto-saved
              </Badge>
            )}
          </div>
        )}

        {!conversationId && (
          <ClientSelector
            value={selectedClientId}
            onChange={onClientChange}
          />
        )}

        {!conversationId && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
            <Checkbox 
              id="part2-protected"
              checked={isPart2Protected}
              onCheckedChange={(checked) => onPart2Change(checked as boolean)}
              disabled={loading}
            />
            <Label 
              htmlFor="part2-protected"
              className="text-sm font-medium cursor-pointer flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-primary" />
              This session involves substance use disorder treatment (42 CFR Part 2)
            </Label>
          </div>
        )}

        <div className="flex justify-between items-center gap-2">
          <div className="flex gap-2 flex-wrap">
            <div data-onboarding="voice-input">
              <VoiceInput
                onResult={(transcript) => {
                  onInputChange(input ? `${input} ${transcript}` : transcript);
                }}
                disabled={loading}
              />
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleFileUpload}
              disabled={loading}
              className="transition-all"
            >
              <Paperclip className="w-4 h-4 mr-2" />
              {showFileUpload ? "Hide Upload" : "Upload Document"}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={loading || !input}
              className="transition-all"
            >
              Clear
            </Button>
          </div>

          <div className="flex gap-2 items-center">
            <div data-onboarding="speak-button">
              {input && (
                <SpeakButton text={input} disabled={loading} />
              )}
            </div>
            
            <Button
              onClick={onSubmit}
              disabled={loading || !input.trim()}
              className="bg-primary hover:bg-primary/90 transition-all shadow-sm"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Analyze Notes
                </>
              )}
            </Button>
          </div>

          {loading && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onStopGeneration}
              className="ml-2"
              data-testid="stop-generation"
            >
              <StopCircle className="w-4 h-4 mr-2" />
              Stop
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
          <kbd className="px-2 py-0.5 bg-secondary rounded text-xs">Ctrl+Enter</kbd>
          to submit • Upload PDF or text documents for analysis
        </p>
      </div>
    </Card>
  );
});

ChatInput.displayName = "ChatInput";
