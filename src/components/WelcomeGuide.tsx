import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Brain, FileText, Lock, Sparkles, Zap, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const WelcomeGuide = () => {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem("clinicalai_has_seen_guide");
    if (!hasSeenGuide) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem("clinicalai_has_seen_guide", "true");
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Welcome to ClinicalAI Assistant</DialogTitle>
              <DialogDescription>
                Transform your clinical notes into professional documentation
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Key Features */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Key Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard
                icon={FileText}
                title="SOAP Notes"
                description="Generate comprehensive SOAP notes from your session observations"
              />
              <FeatureCard
                icon={Zap}
                title="Quick Actions"
                description="One-click generation of summaries, key points, and progress reports"
              />
              <FeatureCard
                icon={FileText}
                title="File Upload"
                description="Upload PDF or text documents for instant analysis"
              />
              <FeatureCard
                icon={FileText}
                title="Export Options"
                description="Download conversations as PDF or text files"
              />
            </div>
          </div>

          <Separator />

          {/* How to Use */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">How to Use</h3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Paste your session notes into the text area</li>
              <li>Choose an analysis type using the quick action buttons</li>
              <li>Review the AI-generated output in real-time</li>
              <li>Export or copy the results for your records</li>
              <li>All conversations are automatically saved in the sidebar</li>
            </ol>
          </div>

          <Separator />

          {/* Important Notices */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Important Information
            </h3>
            
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                AI-Generated Content Disclaimer
              </h4>
              <p className="text-sm text-muted-foreground">
                All AI-generated clinical documentation should be reviewed and verified by a
                qualified healthcare professional before use. This tool is designed to assist,
                not replace, professional clinical judgment.
              </p>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                Privacy & Data Security
              </h4>
              <p className="text-sm text-muted-foreground">
                Your data is encrypted and stored securely. All conversations are private and
                accessible only to you. We follow industry-standard security practices to
                protect your information. Never include personally identifiable information
                (PII) in your notes.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <Label
              htmlFor="dont-show"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Don't show this again
            </Label>
          </div>
          <Button onClick={handleClose} className="bg-primary hover:bg-primary/90">
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const FeatureCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) => (
  <div className="flex gap-3 p-3 rounded-lg bg-secondary/30">
    <Icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
    <div>
      <h4 className="font-medium text-sm text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  </div>
);
