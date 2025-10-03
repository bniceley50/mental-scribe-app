import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SpeakButtonProps {
  text: string;
  disabled?: boolean;
}

export const SpeakButton = ({ text, disabled }: SpeakButtonProps) => {
  const [speaking, setSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // Check browser support
    if (!("speechSynthesis" in window)) {
      setIsSupported(false);
    }

    // Stop speaking when component unmounts
    return () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = () => {
    if (!isSupported) {
      toast.error("Text-to-speech is not supported in your browser");
      return;
    }

    if (!text || text.trim().length === 0) {
      toast.error("No text to read aloud");
      return;
    }

    // If already speaking, stop
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    try {
      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice settings
      utterance.rate = 1.0; // Speed (0.1 to 10)
      utterance.pitch = 1.0; // Pitch (0 to 2)
      utterance.volume = 1.0; // Volume (0 to 1)
      
      // Try to use a more natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        voice => voice.lang.startsWith('en') && voice.name.includes('Google')
      ) || voices.find(
        voice => voice.lang.startsWith('en')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // Event handlers
      utterance.onstart = () => {
        setSpeaking(true);
        toast.success("Reading aloud...", {
          duration: 1500,
        });
      };

      utterance.onend = () => {
        setSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setSpeaking(false);
        toast.error("Error reading text aloud");
      };

      // Speak
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error in text-to-speech:", error);
      toast.error("Failed to read text aloud");
      setSpeaking(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleSpeak}
            disabled={disabled || !isSupported || !text}
            className="transition-all"
            aria-label={speaking ? "Stop reading" : "Read aloud"}
          >
            {speaking ? (
              <VolumeX className="h-4 w-4 animate-pulse" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{speaking ? "Stop reading" : "Read aloud"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
