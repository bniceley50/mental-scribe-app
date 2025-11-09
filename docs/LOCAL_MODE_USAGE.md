## Local Mode Usage Guide

## Quick Start

### 1. Set Processing Mode

```typescript
import { setProcessingMode, createProvider } from "@/core/processing";

// Set to local browser mode
setProcessingMode("local-browser");

// Create provider
const provider = createProvider({
  mode: "local-browser",
  useWebGPU: true,
  modelSize: "base",
});

// Initialize (downloads models)
await provider.initialize();
```

### 2. Create Encrypted Session

```typescript
import { createVault, LocalStorageAdapter } from "@/core/processing";

// Create vault with passphrase
const { dek, salt } = await createVault("my-secure-passphrase");
const storage = new LocalStorageAdapter(dek);

// Create session
const sessionId = await storage.createSession("Therapy Session - 2025-01-10", salt, {
  clientId: "client-123",
  programId: "program-456",
});
```

### 3. Process Audio Locally

```typescript
// Record audio
const mediaRecorder = new MediaRecorder(stream);
const chunks: Blob[] = [];

mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
mediaRecorder.onstop = async () => {
  const audioBlob = new Blob(chunks, { type: "audio/webm" });

  // Transcribe locally
  const result = await provider.stt({ audioBlob });

  // Save encrypted transcript
  await storage.saveArtifact(sessionId, "transcript", {
    text: result.transcript,
    segments: result.segments,
    timestamp: new Date(),
  });

  // Summarize with template
  const soap = await provider.summarize({
    transcript: result.transcript,
    template: "standard",
  });

  // Save encrypted SOAP note
  await storage.saveArtifact(sessionId, "soap", soap);
};

mediaRecorder.start();
```

### 4. Network Status Badge

```typescript
import { getNetworkStatusBadge } from "@/core/processing";
import { Badge } from "@/components/ui/badge";

function NetworkStatus() {
  const badge = getNetworkStatusBadge();

  return (
    <Badge variant={badge.variant}>
      {badge.text}
    </Badge>
  );
}
```

## Example: Complete Workflow

```typescript
import {
  setProcessingMode,
  createProvider,
  createVault,
  LocalStorageAdapter,
  guardedFetch,
} from "@/core/processing";

async function runLocalSession() {
  // 1. Set local mode (blocks all network calls)
  setProcessingMode("local-browser");

  // 2. Initialize provider
  const provider = createProvider({
    mode: "local-browser",
    useWebGPU: true,
    modelSize: "base",
  });
  await provider.initialize();

  // 3. Create encrypted vault
  const { dek, salt } = await createVault("user-passphrase");
  const storage = new LocalStorageAdapter(dek);
  const sessionId = await storage.createSession("Session Title", salt);

  // 4. Process audio
  const audioBlob = await recordAudio(); // Your recording logic

  const { transcript } = await provider.stt({ audioBlob });
  await storage.saveArtifact(sessionId, "transcript", { text: transcript });

  const { soap } = await provider.summarize({
    transcript,
    template: "standard",
  });
  await storage.saveArtifact(sessionId, "soap", soap);

  const { entities, risk } = await provider.extract({ transcript });
  await storage.saveArtifact(sessionId, "entities", entities);
  await storage.saveArtifact(sessionId, "risk", risk);

  console.log("✅ Session processed locally - no PHI transmitted");

  // 5. Retrieve encrypted artifacts
  const artifacts = await storage.getSessionArtifacts(sessionId);
  console.log("Artifacts:", artifacts);
}
```

## LAN Mode (Sprint L2)

### Setup LAN Microservice

**Option 1: Python FastAPI**

```python
# server.py
from fastapi import FastAPI
from faster_whisper import WhisperModel

app = FastAPI()
model = WhisperModel("base", device="cuda")

@app.post("/stt")
async def transcribe(audio: str):
    # Process base64 audio
    segments, info = model.transcribe(audio)
    return {"transcript": " ".join([s.text for s in segments])}

@app.post("/summarize")
async def summarize(transcript: str, template: str):
    # Your summarization logic
    return {"soap": {...}}
```

**Option 2: Node.js Express**

```javascript
// server.js
const express = require("express");
const whisper = require("whisper-node");

const app = express();
app.use(express.json());

app.post("/stt", async (req, res) => {
  const transcript = await whisper.transcribe(req.body.audio);
  res.json({ transcript });
});

app.listen(8000);
```

### Use LAN Provider

```typescript
setProcessingMode("local-lan");

const provider = createProvider({
  mode: "local-lan",
  lanEndpoint: "http://192.168.1.100:8000",
  lanTimeout: 30000,
});

// Check LAN service is reachable
const ready = await provider.isReady();
if (!ready) {
  throw new Error("LAN service unavailable");
}

// Use same API as browser provider
const { transcript } = await provider.stt({ audioBlob });
```

## Security Best Practices

### Passphrase Management

```typescript
// ✅ GOOD: Prompt for passphrase on session start
const passphrase = await promptSecurePassphrase();
const { dek, salt } = await createVault(passphrase);

// Store only salt (not passphrase!)
localStorage.setItem("vault_salt", JSON.stringify(Array.from(salt)));

// ❌ BAD: Never store passphrase
// localStorage.setItem('passphrase', passphrase); // NO!
```

### Unlock Existing Vault

```typescript
import { unlockVault } from "@/core/processing";

const saltArray = JSON.parse(localStorage.getItem("vault_salt")!);
const salt = new Uint8Array(saltArray);

const passphrase = await promptSecurePassphrase();
const dek = await unlockVault(passphrase, salt);

// Now use dek with LocalStorageAdapter
const storage = new LocalStorageAdapter(dek);
```

### Backup Strategy

```typescript
// Export encrypted backup (safe to store in cloud)
const sessions = await storage.getSessions();
const backup = {
  version: "1.0",
  salt: Array.from(salt),
  sessions: sessions.map((s) => ({
    id: s.id,
    title: s.title,
    createdAt: s.createdAt,
    vaultSalt: s.vaultSalt,
  })),
  artifacts: await Promise.all(
    sessions.map(async (s) => ({
      sessionId: s.id,
      items: await storage.getSessionArtifacts(s.id),
    }))
  ),
};

// Download backup
const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `mental-scribe-backup-${Date.now()}.json`;
a.click();
```

## Troubleshooting

### "Model download failed"

Check browser console for CORS errors. Some models may be blocked by CSP. Update `index.html`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:;
  worker-src 'self' blob:;
  connect-src 'self' https://huggingface.co https://cdn-lfs.huggingface.co;
" />
```

### "Out of memory"

Switch to smaller model:

```typescript
const provider = createProvider({
  mode: "local-browser",
  modelSize: "tiny", // Instead of "base"
});
```

### "WebGPU not available"

Fallback to CPU:

```typescript
const provider = createProvider({
  mode: "local-browser",
  useWebGPU: false, // Force CPU mode
});
```

---

**Next**: See `docs/LOCAL_MODE_SETUP.md` for installation and architecture details.
