# @mscribe/flows

Workflow orchestration engine for Mental Scribe with step-by-step execution, conditional logic, and error handling.

## Features

- 🔄 **Sequential execution**: Steps run in order with automatic context passing
- 🎯 **Conditional steps**: Skip steps based on runtime conditions
- 🛡️ **Error handling**: Step-level and flow-level error recovery
- 📊 **Observable results**: RxJS streams for real-time progress tracking
- 🔍 **Rich metadata**: Execution times, status, and detailed results
- 🧩 **Composable steps**: Reusable step definitions

## Installation

```bash
pnpm add @mscribe/flows
```

## Quick Start

```typescript
import { startFlow, createStep, FlowDefinition } from '@mscribe/flows';

// Define a flow
const myFlow: FlowDefinition = {
  name: 'dataProcessing',
  description: 'Process user data',
  steps: [
    createStep('validate', async (context) => {
      const { userId } = context.input;
      return { valid: userId != null };
    }),
    
    createStep('process', async (context) => {
      const validation = context.output.validate as any;
      if (!validation.valid) throw new Error('Invalid input');
      return { processed: true };
    }),
    
    createStep('save', async (context) => {
      // Save results
      return { saved: true, timestamp: new Date().toISOString() };
    }),
  ],
};

// Execute the flow
startFlow(myFlow, { userId: '123' }).subscribe({
  next: (event) => {
    if ('flowName' in event) {
      console.log('Flow result:', event);
    } else {
      console.log('Event:', event.type);
    }
  },
  complete: () => console.log('Flow complete'),
});
```

## Flow Definition

A flow consists of ordered steps that execute sequentially:

```typescript
interface FlowDefinition {
  name: string;                    // Flow identifier
  description?: string;            // Human-readable description
  steps: FlowStep[];               // Ordered array of steps
  onError?: (error, context) => Promise<void>;  // Global error handler
}
```

## Creating Steps

### Basic Step

```typescript
import { createStep } from '@mscribe/flows';

const step = createStep('stepName', async (context) => {
  // Access input data
  const { userId } = context.input;
  
  // Access output from previous steps
  const prevData = context.output.previousStep;
  
  // Return data for next steps
  return { result: 'success' };
});
```

### Conditional Step

Steps can be conditionally executed:

```typescript
const conditionalStep = createStep(
  'optionalStep',
  async (context) => {
    return { executed: true };
  },
  {
    condition: async (context) => {
      // Only run if user is admin
      return context.input.role === 'admin';
    },
  }
);
```

### Step with Error Handler

Handle errors at the step level:

```typescript
const resilientStep = createStep(
  'apiCall',
  async (context) => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('API failed');
    return response.json();
  },
  {
    onError: async (error, context) => {
      // Return fallback data
      console.error('API call failed:', error.message);
      return { data: [], fromCache: true };
    },
  }
);
```

## Flow Context

Context is passed to every step:

```typescript
interface FlowContext {
  flowId: string;                  // Unique execution ID
  input: Record<string, unknown>;  // Original input data
  output: Record<string, unknown>; // Accumulated step results
  metadata: {
    startedAt: string;             // ISO timestamp
    userId?: string;               // Optional user ID
    [key: string]: unknown;        // Custom metadata
  };
}
```

## Example Flows

### Clinical Note Creation

```typescript
import { FlowDefinition, createStep } from '@mscribe/flows';

const noteCreationFlow: FlowDefinition = {
  name: 'noteCreation',
  description: 'Create clinical note from audio',
  steps: [
    // 1. Verify patient consent
    createStep(
      'checkConsent',
      async (context) => {
        const { patientId } = context.input;
        const consent = await checkPatientConsent(patientId);
        if (!consent) throw new Error('No consent found');
        return { consentId: consent.id };
      },
      {
        condition: async (context) => !!context.input.patientId,
      }
    ),
    
    // 2. Transcribe audio
    createStep('transcribe', async (context) => {
      const { audioUrl } = context.input;
      const result = await transcribeAudio(audioUrl);
      return { transcript: result.text, language: result.language };
    }),
    
    // 3. Generate clinical note
    createStep('generateNote', async (context) => {
      const transcription = context.output.transcribe as any;
      const note = await generateClinicalNote(transcription.transcript);
      return { noteId: note.id, content: note.content };
    }),
    
    // 4. Save to database
    createStep('saveNote', async (context) => {
      const note = context.output.generateNote as any;
      const { sessionId } = context.input;
      await saveNoteToDatabase(note.noteId, sessionId);
      return { saved: true, timestamp: new Date().toISOString() };
    }),
  ],
  
  onError: async (error, context) => {
    // Log to error tracking
    console.error(`Flow ${context.flowId} failed:`, error.message);
    await logFlowError(context.flowId, error);
  },
};
```

### Multi-Stage Data Pipeline

```typescript
const dataPipeline: FlowDefinition = {
  name: 'dataPipeline',
  steps: [
    createStep('fetch', async () => {
      const data = await fetchFromAPI();
      return { rawData: data };
    }),
    
    createStep('transform', async (context) => {
      const raw = context.output.fetch as any;
      const transformed = transformData(raw.rawData);
      return { transformedData: transformed };
    }),
    
    createStep('validate', async (context) => {
      const data = context.output.transform as any;
      const errors = validateData(data.transformedData);
      if (errors.length > 0) throw new Error(`Validation failed: ${errors.join(', ')}`);
      return { valid: true };
    }),
    
    createStep('store', async (context) => {
      const data = context.output.transform as any;
      await storeInDatabase(data.transformedData);
      return { stored: true, count: data.transformedData.length };
    }),
  ],
};
```

## Flow Execution

### Basic Execution

```typescript
startFlow(myFlow, { userId: '123' }).subscribe({
  next: (event) => console.log('Flow event:', event),
  error: (err) => console.error('Flow error:', err),
  complete: () => console.log('Flow complete'),
});
```

### With User Context

```typescript
startFlow(
  myFlow,
  { userId: '123' },
  {
    userId: 'user-456',
    metadata: { source: 'api', requestId: 'req-789' },
  }
).subscribe({
  next: (event) => {
    if ('flowName' in event) {
      // FlowResult
      const result = event as FlowResult;
      console.log(`Flow ${result.status}:`, result.output);
    }
  },
});
```

### React Integration

```typescript
import { useEffect, useState } from 'react';
import { startFlow, FlowResult } from '@mscribe/flows';

function FlowRunner({ flowDef, input }) {
  const [result, setResult] = useState<FlowResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = startFlow(flowDef, input).subscribe({
      next: (event) => {
        if ('flowName' in event) {
          setResult(event as FlowResult);
        }
      },
      error: (err) => setError(err.message),
    });

    return () => subscription.unsubscribe();
  }, [flowDef, input]);

  if (error) return <div>Error: {error}</div>;
  if (!result) return <div>Running flow...</div>;
  
  return <div>Flow {result.status}: {result.steps.length} steps</div>;
}
```

## Flow Results

Execution returns a detailed result:

```typescript
interface FlowResult {
  flowId: string;                  // Unique execution ID
  flowName: string;                // Flow name
  status: 'completed' | 'failed' | 'partial';  // Overall status
  steps: StepResult[];             // Results from each step
  output: Record<string, unknown>; // Final accumulated output
  durationMs: number;              // Total execution time
  error?: string;                  // Error message if failed
}

interface StepResult {
  step: string;                    // Step name
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  data?: unknown;                  // Step output
  error?: string;                  // Error message if failed
  durationMs: number;              // Step execution time
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { startFlow, createStep } from '@mscribe/flows';
import { firstValueFrom, toArray } from 'rxjs';

describe('My Flow', () => {
  it('should execute all steps', async () => {
    const flow = {
      name: 'testFlow',
      steps: [
        createStep('step1', async () => ({ value: 1 })),
        createStep('step2', async (ctx) => {
          const prev = ctx.output.step1 as any;
          return { value: prev.value + 1 };
        }),
      ],
    };

    const events$ = startFlow(flow, {});
    const events = await firstValueFrom(events$.pipe(toArray()));
    const result = events[events.length - 1] as any;

    expect(result.status).toBe('completed');
    expect(result.output.step2).toEqual({ value: 2 });
  });
});
```

## Best Practices

1. **Keep steps focused**: Each step should do one thing well
2. **Use descriptive names**: Step names should clearly indicate their purpose
3. **Handle errors gracefully**: Use step-level error handlers for recoverable errors
4. **Pass minimal data**: Only include necessary data in context
5. **Test flows independently**: Unit test flows with mock implementations
6. **Add conditions wisely**: Use conditions to optimize flow execution
7. **Log important events**: Use flow-level onError for logging and monitoring

## Integration with @mscribe/events

Flows automatically emit events compatible with `@mscribe/events`:

```typescript
import { startFlow } from '@mscribe/flows';

startFlow(myFlow, input).subscribe({
  next: (event) => {
    // Events include: run_started, run_finished
    if (event.type === 'run_started') {
      console.log('Flow started:', event.runId);
    }
  },
});
```

## Playground

Test flows interactively with the Flow Playground:

```bash
pnpm --filter @mscribe/playground dev
```

Visit http://localhost:3001 to:
- Execute pre-built flows
- View real-time execution
- Inspect step results
- Debug flow errors

## License

MIT
