import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInterfaceProps {
  onTranscript: (text: string) => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ 
  onTranscript,
  onSpeakingChange 
}) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const chatRef = useRef<RealtimeChat | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');

  const handleMessage = (event: any) => {
    console.log('Voice event:', event.type);
    
    if (event.type === 'response.audio.delta') {
      setIsAISpeaking(true);
      onSpeakingChange?.(true);
    } else if (event.type === 'response.audio.done') {
      setIsAISpeaking(false);
      onSpeakingChange?.(false);
    } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
      const transcript = event.transcript || '';
      setCurrentTranscript(prev => prev + ' ' + transcript);
      onTranscript(transcript);
    } else if (event.type === 'response.audio_transcript.delta') {
      // AI response transcript
      const delta = event.delta || '';
      setCurrentTranscript(prev => prev + delta);
    } else if (event.type === 'response.done') {
      if (currentTranscript) {
        onTranscript(currentTranscript);
        setCurrentTranscript('');
      }
    }
  };

  const startConversation = async () => {
    try {
      chatRef.current = new RealtimeChat(handleMessage);
      await chatRef.current.init();
      setIsConnected(true);
      
      toast({
        title: "Voice capture started",
        description: "Speak naturally - the AI will transcribe and assist you",
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to start voice capture',
        variant: "destructive",
      });
    }
  };

  const endConversation = () => {
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsAISpeaking(false);
    onSpeakingChange?.(false);
    
    toast({
      title: "Voice capture ended",
      description: "Session recording stopped",
    });
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {!isConnected ? (
        <Button 
          onClick={startConversation}
          size="lg"
          className="gap-2"
        >
          <Mic className="h-5 w-5" />
          Start Voice Capture
        </Button>
      ) : (
        <Button 
          onClick={endConversation}
          variant="destructive"
          size="lg"
          className="gap-2"
        >
          <MicOff className="h-5 w-5" />
          {isAISpeaking ? 'AI Speaking...' : 'Stop Voice Capture'}
        </Button>
      )}
    </div>
  );
};

export default VoiceInterface;
