import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  title: string;
  description: string;
  target?: string;
  position?: "top" | "bottom" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to ClinicalAI Assistant",
    description: "Let's take a quick tour to help you get started with clinical documentation.",
  },
  {
    title: "Start a New Conversation",
    description: "Type your session notes or click the quick action buttons to generate SOAP notes, summaries, or progress reports.",
    target: "chat-input",
    position: "top",
  },
  {
    title: "Upload Documents",
    description: "Click the paperclip icon to upload PDFs or text files for analysis.",
    target: "file-upload-button",
    position: "top",
  },
  {
    title: "View Your History",
    description: "Access past conversations from the sidebar to review or continue working.",
    target: "conversation-sidebar",
    position: "right",
  },
  {
    title: "Multi-Factor Authentication",
    description: "Secure your account by enabling MFA in Settings for enhanced protection of sensitive data.",
    target: "settings-link",
    position: "bottom",
  },
];

export function OnboardingTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has seen the tour
    const hasSeenTour = sessionStorage.getItem("clinicalai_tour_completed");
    if (!hasSeenTour && !dismissed) {
      // Delay showing tour slightly for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [dismissed]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    sessionStorage.setItem("clinicalai_tour_completed", "true");
    setIsVisible(false);
    setDismissed(true);
  };

  const handleSkip = () => {
    sessionStorage.setItem("clinicalai_tour_completed", "true");
    setIsVisible(false);
    setDismissed(true);
  };

  if (!isVisible) return null;

  const step = tourSteps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 pointer-events-auto"
        onClick={handleSkip}
        role="presentation"
        aria-label="Tour overlay"
      />
      
      {/* Tour Card */}
      <Card 
        className={cn(
          "fixed z-50 w-full max-w-md shadow-2xl border-2 border-primary/20",
          "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
      >
        <CardHeader className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-6 w-6"
            onClick={handleSkip}
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle id="tour-title" className="pr-8">{step.title}</CardTitle>
          <CardDescription id="tour-description">{step.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress indicator */}
          <div className="flex gap-1">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  index === currentStep ? "bg-primary" : "bg-muted"
                )}
                role="progressbar"
                aria-valuenow={index === currentStep ? 100 : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Step ${index + 1} of ${tourSteps.length}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              aria-label="Previous step"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {currentStep + 1} of {tourSteps.length}
            </span>

            <Button
              size="sm"
              onClick={handleNext}
              aria-label={currentStep === tourSteps.length - 1 ? "Finish tour" : "Next step"}
            >
              {currentStep === tourSteps.length - 1 ? "Finish" : "Next"}
              {currentStep < tourSteps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>

          {/* Skip button */}
          <div className="text-center pt-2 border-t">
            <Button
              variant="link"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
              aria-label="Skip tour"
            >
              Skip tour
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
