import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

const ChatInterface = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    try {
      // TODO: Integrate with OpenAI API via edge function
      toast.info("AI analysis coming soon!");
      console.log("Analyzing notes:", input);
    } catch (error) {
      toast.error("Failed to analyze notes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Session Notes Input
          </CardTitle>
          <CardDescription>
            Paste your patient session notes below to generate clinical documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your session notes here...&#10;&#10;Include patient observations, session content, interventions used, and any notable behavioral or emotional changes..."
              className="min-h-[300px] resize-y transition-all focus:shadow-md"
              disabled={loading}
            />
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInput("")}
                disabled={loading || !input}
                className="transition-all"
              >
                Clear
              </Button>
              <Button
                type="submit"
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
                    Generate Documentation
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-md border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            AI-Generated Output
          </CardTitle>
          <CardDescription>
            SOAP notes and clinical summary will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-[200px] p-6 rounded-lg bg-muted/50 border border-border text-center flex items-center justify-center">
            <div className="text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Generated documentation will appear here</p>
              <p className="text-sm mt-2">Enter your session notes above to get started</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChatInterface;
