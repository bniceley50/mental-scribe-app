# @mscribe/events

Type-safe event streaming for Mental Scribe edge functions using RxJS Observables.

## Features

- 🎯 **Type-safe events**: All events are strongly typed with TypeScript
- 🔄 **RxJS Observables**: Reactive streams for edge function responses
- 📡 **SSE streaming**: Server-Sent Events with automatic parsing
- 🛡️ **Error handling**: Built-in error handling and validation
- 🔌 **Multiple sources**: Support for fetch-based and EventSource streaming

## Installation

```bash
pnpm add @mscribe/events
```

## Usage

### Basic streaming example

```typescript
import { streamEdgeFunction } from '@mscribe/events';

// Stream events from edge function
const stream$ = streamEdgeFunction(
  'https://project.supabase.co/functions/v1/generate-note',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ sessionId: '123' })
  }
);

// Subscribe to events
stream$.subscribe({
  next: (event) => {
    if (event.type === 'text_message_delta') {
      console.log('Streaming text:', event.delta);
    } else if (event.type === 'run_finished') {
      console.log('Run completed:', event.status);
    }
  },
  error: (err) => console.error('Stream error:', err),
  complete: () => console.log('Stream finished')
});
```

### React integration

```typescript
import { useEffect, useState } from 'react';
import { streamEdgeFunction, TextMessageDelta } from '@mscribe/events';

function ChatComponent() {
  const [text, setText] = useState('');

  useEffect(() => {
    const subscription = streamEdgeFunction(edgeUrl, options).subscribe({
      next: (event) => {
        if (event.type === 'text_message_delta') {
          setText(prev => prev + event.delta);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <div>{text}</div>;
}
```

### RxJS operators

```typescript
import { filter, map } from 'rxjs';
import { streamEdgeFunction, TextMessageDelta } from '@mscribe/events';

// Filter only text deltas and extract content
const textStream$ = streamEdgeFunction(url, options).pipe(
  filter((event): event is TextMessageDelta => event.type === 'text_message_delta'),
  map(event => event.delta)
);

textStream$.subscribe(text => console.log('Text chunk:', text));
```

## Event Types

All events extend `BaseEvent`:

```typescript
interface BaseEvent {
  type: string;
  timestamp: string; // ISO 8601
}
```

### Available events

- `RunStartedEvent`: Edge function execution started
- `RunFinishedEvent`: Edge function execution completed
- `TextMessageDelta`: Streaming text chunk from GPT-4
- `TextMessageComplete`: Full text message completed
- `TranscriptionStarted`: Whisper transcription started
- `TranscriptionComplete`: Transcription finished
- `TranscriptionError`: Transcription failed
- `NoteGenerated`: Clinical note generated
- `NoteSaved`: Note saved to database
- `AuditEntryCreated`: Audit log entry created
- `ErrorEvent`: Error occurred

## Creating events

Use the `createEvent` helper to create typed events:

```typescript
import { createEvent, RunStartedEvent } from '@mscribe/events';

const event = createEvent<RunStartedEvent>('run_started', {
  runId: 'abc123',
  functionName: 'generate-note'
});
// Automatically includes timestamp
```

## Edge function integration

Your edge function should emit events as Server-Sent Events:

```typescript
// Deno edge function
import { createEvent, TextMessageDelta } from '@mscribe/events';

Deno.serve(async (req) => {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Emit event
      const event = createEvent<TextMessageDelta>('text_message_delta', {
        delta: 'Hello',
        runId: 'run-123'
      });
      
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
      );
      
      // Signal completion
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
});
```

## Testing

Run tests with:

```bash
pnpm test
```

Run with coverage:

```bash
pnpm test:coverage
```

## License

MIT
