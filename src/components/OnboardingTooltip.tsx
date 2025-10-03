import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOnboarding } from "@/hooks/useOnboarding";
import { 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Sparkles,
  Mic,
  Volume2,
  FileText,
  Table,
  Brain,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TooltipStep {
  target: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: "top" | "bottom" | "left" | "right";
}

const onboardingSteps: TooltipStep[] = [
  {
    target: "[data-onboarding='voice-input']",
    title: "Voice Input - Dictate Your Notes",
    description: "Click the microphone to start dictating your clinical notes hands-free. Your speech will be transcribed in real-time.",
    icon: <Mic className="h-5 w-5" />,
    position: "bottom",
  },
  {
    target: "[data-onboarding='speak-button']",
    title: "Text-to-Speech - Listen to Your Notes",
    description: "Click the speaker icon to have your notes read aloud. Great for reviewing documentation hands-free.",
    icon: <Volume2 className="h-5 w-5" />,
    position: "bottom",
  },
  {
    target: "[data-onboarding='tabs']",
    title: "Documentation Modes",
    description: "Switch between Free-form notes (AI-assisted) and Structured forms (standardized templates) based on your needs.",
    icon: <FileText className="h-5 w-5" />,
    position: "top",
  },
  {
    target: "[data-onboarding='quick-actions']",
    title: "Quick Actions",
    description: "Use these buttons to instantly format your notes as SOAP notes, summaries, key points, or progress reports.",
    icon: <Sparkles className="h-5 w-5" />,
    position: "top",
  },
  {
    target: "[data-onboarding='advanced-analysis']",
    title: "Advanced AI Analysis",
    description: "Extract medical entities, generate clinical summaries, and perform risk assessments with one click.",
    icon: <Brain className="h-5 w-5" />,
    position: "top",
  },
  {
    target: "[data-onboarding='structured-form']",
    title: "Structured Clinical Forms",
    description: "Use standardized forms with auto-save for comprehensive session documentation. Perfect for detailed record-keeping.",
    icon: <Table className="h-5 w-5" />,
    position: "top",
  },
  {
    target: "[data-onboarding='help-button']",
    title: "Need Help?",
    description: "Click here anytime for comprehensive guides, troubleshooting tips, and feature documentation.",
    icon: <HelpCircle className="h-5 w-5" />,
    position: "bottom",
  },
];

export const OnboardingTooltip = () => {
  const { currentStep, isActive, nextStep, previousStep, skipOnboarding, completeOnboarding } = useOnboarding();
  const targetRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStepData = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  useEffect(() => {
    if (isActive && currentStepData) {
      const target = document.querySelector(currentStepData.target) as HTMLElement;
      targetRef.current = target;

      if (target) {
        // Scroll target into view
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        
        // Add highlight effect
        target.classList.add("onboarding-highlight");
        
        // Position tooltip
        updateTooltipPosition();
      }

      return () => {
        if (targetRef.current) {
          targetRef.current.classList.remove("onboarding-highlight");
        }
      };
    }
  }, [currentStep, isActive, currentStepData]);

  const updateTooltipPosition = () => {
    if (!targetRef.current || !tooltipRef.current) return;

    const targetRect = targetRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    const { position } = currentStepData;

    let top = 0;
    let left = 0;

    switch (position) {
      case "top":
        top = targetRect.top - tooltip.offsetHeight - 16;
        left = targetRect.left + (targetRect.width / 2) - (tooltip.offsetWidth / 2);
        break;
      case "bottom":
        top = targetRect.bottom + 16;
        left = targetRect.left + (targetRect.width / 2) - (tooltip.offsetWidth / 2);
        break;
      case "left":
        top = targetRect.top + (targetRect.height / 2) - (tooltip.offsetHeight / 2);
        left = targetRect.left - tooltip.offsetWidth - 16;
        break;
      case "right":
        top = targetRect.top + (targetRect.height / 2) - (tooltip.offsetHeight / 2);
        left = targetRect.right + 16;
        break;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  };

  if (!isActive) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] animate-fade-in"
        onClick={skipOnboarding}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[101] animate-scale-in"
        style={{ maxWidth: "400px" }}
      >
        <Card className="shadow-2xl border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  {currentStepData.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg leading-tight">
                    {currentStepData.title}
                  </h3>
                  <Badge variant="secondary" className="mt-1">
                    Step {currentStep + 1} of {onboardingSteps.length}
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={skipOnboarding}
                className="h-8 w-8 -mt-2 -mr-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              {currentStepData.description}
            </p>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={previousStep}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipOnboarding}
                >
                  Skip Tour
                </Button>
                
                {isLastStep ? (
                  <Button
                    onClick={completeOnboarding}
                    className="gap-2"
                  >
                    Get Started
                    <Sparkles className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={nextStep}
                    className="gap-2"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Arrow pointer */}
        <div
          className={cn(
            "absolute w-0 h-0 border-8",
            currentStepData.position === "top" && "bottom-[-16px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-card",
            currentStepData.position === "bottom" && "top-[-16px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-card",
            currentStepData.position === "left" && "right-[-16px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-card",
            currentStepData.position === "right" && "left-[-16px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-card"
          )}
        />
      </div>

      {/* Spotlight effect on target */}
      <style>{`
        .onboarding-highlight {
          position: relative;
          z-index: 102;
          box-shadow: 0 0 0 4px rgba(var(--primary), 0.3), 0 0 0 9999px rgba(0, 0, 0, 0.5);
          border-radius: 0.5rem;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </>
  );
};
