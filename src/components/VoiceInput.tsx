import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Web Speech API types (browser API)
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface VoiceInputProps {
  onResult: (text: string) => void;
  disabled?: boolean;
}

export const VoiceInput = ({ onResult, disabled }: VoiceInputProps) => {
  const [recording, setRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check browser support on mount
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const handleStart = () => {
    if (!isSupported) {
      toast.error("Speech recognition is not supported in your browser", {
        description: "Try using Chrome, Edge, or Safari",
      });
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Configuration
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.continuous = true; // Keep listening
      recognitionRef.current.interimResults = true; // Get partial results
      recognitionRef.current.maxAlternatives = 1;

      // Handle results
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interimTranscript += transcript;
          }
        }

        // Send final results to parent
        if (finalTranscript) {
          onResult(finalTranscript.trim());
        }
      };

      // Handle errors
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setRecording(false);
        
        if (event.error === "no-speech") {
          toast.error("No speech detected", {
            description: "Please try speaking again",
          });
        } else if (event.error === "not-allowed") {
          toast.error("Microphone access denied", {
            description: "Please allow microphone access in your browser settings",
          });
        } else {
          toast.error("Speech recognition error", {
            description: event.error,
          });
        }
      };

      // Handle end
      recognitionRef.current.onend = () => {
        setRecording(false);
      };

      // Start recognition
      recognitionRef.current.start();
      setRecording(true);
      
      toast.success("Listening...", {
        description: "Speak your clinical notes",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      toast.error("Failed to start voice input");
      setRecording(false);
    }
  };

  const handleStop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setRecording(false);
      toast.info("Stopped listening");
    }
  };

  return (
    <Button
      type="button"
      variant={recording ? "destructive" : "outline"}
      size="icon"
      onClick={recording ? handleStop : handleStart}
      disabled={disabled || !isSupported}
      className={cn(
        "transition-all",
        recording && "animate-pulse shadow-lg"
      )}
      aria-label={recording ? "Stop recording" : "Start voice input"}
      title={recording ? "Click to stop recording" : "Click to start voice input"}
    >
      {recording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
};
