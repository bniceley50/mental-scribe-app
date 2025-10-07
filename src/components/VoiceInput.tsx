import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
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
  onStartRecording?: () => void;
  onStopRecording?: () => void;
}

export const VoiceInput = ({ onResult, disabled, onStartRecording, onStopRecording }: VoiceInputProps) => {
  const [recording, setRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const accumulatedTextRef = useRef<string>("");

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
      
      // Reset accumulated text for new session
      accumulatedTextRef.current = "";
      
      // Configuration
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false; // Only final results
      recognitionRef.current.maxAlternatives = 1;

      // Handle results - emit ONLY the delta (new text)
      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + " ";
          }
        }

        // Emit only the new delta since last emission
        if (finalTranscript) {
          const trimmedTranscript = finalTranscript.trim();
          if (trimmedTranscript.length > accumulatedTextRef.current.length) {
            const newDelta = trimmedTranscript.substring(accumulatedTextRef.current.length).trim();
            console.log("VoiceInput: Emitting delta:", {
              newDelta,
              finalLength: trimmedTranscript.length,
              prevLength: accumulatedTextRef.current.length,
            });
            onResult(newDelta);
            accumulatedTextRef.current = trimmedTranscript;
          }
        }
      };

      // Handle errors
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setRecording(false);
        accumulatedTextRef.current = "";
        onStopRecording?.();
        
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
        accumulatedTextRef.current = "";
        onStopRecording?.();
      };

      // Start recognition
      recognitionRef.current.start();
      setRecording(true);
      onStartRecording?.();
      
      toast.success("Listening...", {
        description: "Speak your clinical notes",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      toast.error("Failed to start voice input");
      setRecording(false);
      accumulatedTextRef.current = "";
      onStopRecording?.();
    }
  };

  const handleStop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      // onend will handle cleanup
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
