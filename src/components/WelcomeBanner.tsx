import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";

export const WelcomeBanner = () => {
  const [visible, setVisible] = useState(false);
  const { hasCompletedOnboarding, startOnboarding } = useOnboarding();

  useEffect(() => {
    // Show banner for first-time users
    if (!hasCompletedOnboarding) {
      setVisible(true);
    }
  }, [hasCompletedOnboarding]);

  if (!visible) return null;

  return (
    <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/5 to-accent/5 animate-fade-in">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Welcome to Clinical Note Analysis!</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Transform your clinical documentation with AI-powered features including voice input,
              medical entity extraction, and comprehensive analysis. New here? Take a quick tour!
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setVisible(false);
                  startOnboarding();
                }}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Start Tour
              </Button>
              <Button
                variant="outline"
                onClick={() => setVisible(false)}
              >
                Explore on My Own
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setVisible(false)}
            className="ml-4"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
