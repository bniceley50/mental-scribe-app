# External Services Setup Guide

This document provides setup instructions for external services that complement the Mental Scribe platform but run outside of Lovable Cloud.

---

## 1. Expo Mobile App (Sprint B)

### Overview
A React Native mobile app for recording and uploading audio sessions.

### Setup

1. **Install Expo CLI**
```bash
npm install -g expo-cli
```

2. **Create Expo Project**
```bash
expo init mental-scribe-mobile
cd mental-scribe-mobile
```

3. **Install Dependencies**
```bash
npm install @supabase/supabase-js expo-av expo-file-system
```

4. **Recording Upload Screen** (`screens/RecordingScreen.tsx`)
```typescript
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

export function RecordingScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [uploading, setUploading] = useState(false);

  async function startRecording() {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    setRecording(recording);
  }

  async function stopRecording() {
    if (!recording) return;
    
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    
    if (uri) {
      await uploadRecording(uri);
    }
    setRecording(null);
  }

  async function uploadRecording(uri: string) {
    setUploading(true);
    try {
      const fileName = `recording-${Date.now()}.m4a`;
      
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('recordings')
        .upload(fileName, decode(base64), {
          contentType: 'audio/m4a',
        });

      if (error) throw error;

      // Trigger processing via Edge Function
      const { error: processError } = await supabase.functions.invoke(
        'process-recording',
        { body: { fileName } }
      );

      if (processError) throw processError;

      alert('Recording uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload recording');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View>
      <Button
        title={recording ? 'Stop Recording' : 'Start Recording'}
        onPress={recording ? stopRecording : startRecording}
        disabled={uploading}
      />
      {uploading && <ActivityIndicator />}
    </View>
  );
}

function decode(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes]);
}
```

5. **Configure Supabase Client** (`lib/supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## 2. Faster-Whisper Service (Sprint B)

### Overview
A FastAPI service running faster-whisper for high-performance transcription with VAD (Voice Activity Detection) and chunking.

### Setup

1. **Install Python Dependencies**
```bash
pip install fastapi uvicorn faster-whisper python-multipart pydub
```

2. **Create FastAPI Service** (`whisper_service.py`)
```python
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
from pydub import AudioSegment
from pydub.silence import detect_nonsilent
import tempfile
import os

app = FastAPI()

# CORS for Supabase Edge Functions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model (large-v2 for best accuracy)
model = WhisperModel("large-v2", device="cuda", compute_type="float16")

@app.post("/transcribe")
async def transcribe(file: UploadFile):
    """
    Transcribe audio with chunking by silence (VAD)
    Returns: { text, segments[], language, duration }
    """
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Load audio and detect silence
        audio = AudioSegment.from_file(tmp_path)
        nonsilent_ranges = detect_nonsilent(
            audio, 
            min_silence_len=1000,  # 1 second silence
            silence_thresh=-40     # dB
        )

        # Chunk by silence
        chunks = []
        for i, (start, end) in enumerate(nonsilent_ranges):
            chunk_audio = audio[start:end]
            chunk_path = f"{tmp_path}.chunk{i}.wav"
            chunk_audio.export(chunk_path, format="wav")
            chunks.append(chunk_path)

        # Transcribe each chunk
        all_segments = []
        full_text = []
        
        for chunk_path in chunks:
            segments, info = model.transcribe(
                chunk_path,
                beam_size=5,
                vad_filter=True,
                vad_parameters={
                    "threshold": 0.5,
                    "min_speech_duration_ms": 250,
                }
            )
            
            for segment in segments:
                all_segments.append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text,
                    "confidence": segment.avg_logprob,
                })
                full_text.append(segment.text)
            
            os.remove(chunk_path)

        # Cleanup
        os.remove(tmp_path)

        return {
            "text": " ".join(full_text),
            "segments": all_segments,
            "language": info.language if info else "unknown",
            "duration": len(audio) / 1000.0,  # seconds
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/diarize")
async def diarize(file: UploadFile):
    """
    Future: Speaker diarization using pyannote.audio
    """
    return {"error": "Diarization not yet implemented"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

3. **Run the Service**
```bash
python whisper_service.py
```

4. **Docker Deployment** (`Dockerfile`)
```dockerfile
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg

WORKDIR /app
COPY requirements.txt .
RUN pip3 install -r requirements.txt

COPY whisper_service.py .

CMD ["uvicorn", "whisper_service:app", "--host", "0.0.0.0", "--port", "8000"]
```

5. **Edge Function Integration** (`supabase/functions/process-recording/index.ts`)
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const WHISPER_SERVICE_URL = Deno.env.get('WHISPER_SERVICE_URL') || 'http://localhost:8000';

serve(async (req) => {
  const { fileName } = await req.json();
  const supabase = createClient(/*...*/);

  // 1. Download audio from storage
  const { data: audioData, error: downloadError } = await supabase.storage
    .from('recordings')
    .download(fileName);

  if (downloadError) throw downloadError;

  // 2. Send to Whisper service
  const formData = new FormData();
  formData.append('file', audioData, fileName);

  const whisperResponse = await fetch(`${WHISPER_SERVICE_URL}/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!whisperResponse.ok) {
    throw new Error('Whisper service error');
  }

  const transcription = await whisperResponse.json();

  // 3. Store transcription in DB
  await supabase.from('recordings').update({
    transcription_text: transcription.text,
    transcription_segments: transcription.segments,
    transcription_status: 'completed',
    duration_seconds: Math.round(transcription.duration),
  }).eq('file_name', fileName);

  return new Response(JSON.stringify(transcription), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## 3. Local Mode (Future: Tauri Desktop)

### Overview
A desktop app running local Whisper + LLM for offline/on-premises deployments.

### Setup (Planned)

1. **Create Tauri Project**
```bash
npm create tauri-app
```

2. **Integrate whisper.cpp**
```bash
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make
```

3. **Desktop Architecture**
```
Tauri App
├── Frontend (React - same as web)
├── Backend (Rust)
│   ├── whisper.cpp binding
│   ├── llama.cpp binding (for local LLM)
│   └── SQLite for local storage
└── Native APIs
    ├── File system access
    └── Microphone capture
```

This is for future implementation when HIPAA compliance requires on-premises deployment.

---

## 4. Scrubadub + spaCy (Enhanced PII)

### Overview
More sophisticated NER-based PII detection using scrubadub and spaCy models.

### Setup

1. **Install Python Package**
```bash
pip install scrubadub scrubadub-spacy spacy
python -m spacy download en_core_web_lg
```

2. **Create Redaction Service** (`pii_service.py`)
```python
from fastapi import FastAPI
import scrubadub
import scrubadub_spacy

app = FastAPI()

# Initialize scrubadub with spaCy detector
scrubber = scrubadub.Scrubber()
scrubber.add_detector(scrubadub_spacy.detectors.SpacyEntityDetector)

@app.post("/redact")
async def redact_pii(text: str):
    """
    Redact PII using NER (Named Entity Recognition)
    """
    redacted = scrubber.clean(text)
    
    # Count redactions
    original_len = len(text)
    redacted_len = len(redacted)
    redaction_count = text.count('[') - redacted.count('[')
    
    return {
        "original": text,
        "redacted": redacted,
        "had_pii": redaction_count > 0,
        "redaction_count": redaction_count,
    }
```

3. **Integrate with Edge Functions**
```typescript
// Call Python service from Edge Function
const piiResponse = await fetch('http://pii-service:8001/redact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: clinicalNote })
});

const { redacted, had_pii } = await piiResponse.json();
```

---

## 5. Monitoring & Observability

### Recommended Stack
- **Sentry**: Error tracking for Edge Functions
- **Grafana**: Metrics visualization
- **Prometheus**: Metrics collection from Whisper service

### Example: Sentry Integration
```typescript
// Edge Function
import * as Sentry from "https://deno.land/x/sentry/index.ts";

Sentry.init({ dsn: Deno.env.get('SENTRY_DSN') });

try {
  // ... function logic
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

---

## Security Considerations

1. **Whisper Service**: Run behind VPN or private network
2. **API Keys**: Store in Lovable Cloud secrets, not in code
3. **CORS**: Whitelist only your Supabase Edge Function domains
4. **Rate Limiting**: Implement per-user quotas in services
5. **Logging**: Never log PHI in external services

---

**Next Steps:**
- Set up Expo mobile app for audio recording
- Deploy Faster-Whisper service on GPU server
- Configure Edge Functions to call external services
- Monitor quota usage and performance

**Questions?** Contact the development team or refer to the main [ARCHITECTURE.md](./ARCHITECTURE.md).
