import { FlowDefinition, createStep, FlowContext } from './engine.js';

/**
 * Example flow: Clinical note creation workflow
 * 
 * Steps:
 * 1. Check patient consent
 * 2. Transcribe audio with Whisper
 * 3. Generate clinical note with GPT-4
 * 4. Save note to database
 * 5. Generate SOAP summary
 */
export const noteCreationFlow: FlowDefinition = {
  name: 'noteCreation',
  description: 'Complete workflow for creating a clinical note from audio',
  steps: [
    createStep(
      'checkConsent',
      async (context: FlowContext) => {
        const { sessionId, patientId } = context.input;
        
        // Simulate consent check
        // In real implementation, this would call Supabase
        console.log(`Checking consent for patient ${patientId} in session ${sessionId}`);
        
        return {
          hasConsent: true,
          consentId: 'consent-123',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        };
      },
      {
        description: 'Verify patient has given consent for recording',
        condition: async (context: FlowContext) => {
          // Only check consent if patientId is provided
          return !!context.input.patientId;
        },
      }
    ),

    createStep(
      'transcribe',
      async (context: FlowContext) => {
        const { audioUrl } = context.input;
        
        // Simulate Whisper transcription
        // In real implementation, this would call the transcribe edge function
        console.log(`Transcribing audio from ${audioUrl}`);
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          transcript: 'Patient reports feeling anxious about work deadlines. Sleep quality has decreased over the past two weeks.',
          language: 'en',
          durationSeconds: 180,
        };
      },
      {
        description: 'Transcribe audio recording with Whisper',
      }
    ),

    createStep(
      'generateNote',
      async (context: FlowContext) => {
        const transcription = context.output.transcribe as any;
        const { sessionId } = context.input;
        
        // Simulate GPT-4 note generation
        // In real implementation, this would call the generate-note edge function
        console.log(`Generating clinical note from transcript for session ${sessionId}`);
        
        await new Promise(resolve => setTimeout(resolve, 150));
        
        return {
          noteId: `note-${Date.now()}`,
          content: `# Clinical Note

**Subjective:**
${transcription?.transcript || 'No transcript available'}

**Objective:**
Patient appears alert and oriented. Mood congruent with reported stress.

**Assessment:**
Adjustment disorder with anxiety related to occupational stress.

**Plan:**
1. Continue weekly therapy sessions
2. Discuss stress management techniques
3. Re-evaluate in 2 weeks`,
          format: 'SOAP',
        };
      },
      {
        description: 'Generate structured clinical note with GPT-4',
      }
    ),

    createStep(
      'saveNote',
      async (context: FlowContext) => {
        const note = context.output.generateNote as any;
        const { sessionId, patientId } = context.input;
        
        // Simulate database save
        // In real implementation, this would call Supabase
        console.log(`Saving note ${note?.noteId} to database`);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        return {
          saved: true,
          noteId: note?.noteId,
          sessionId,
          patientId,
          savedAt: new Date().toISOString(),
        };
      },
      {
        description: 'Save note to Supabase database',
        onError: async (error: Error) => {
          console.error('Failed to save note:', error.message);
          // Could implement retry logic or save to backup location
          throw error; // Re-throw if we can't recover
        },
      }
    ),

    createStep(
      'generateSummary',
      async (context: FlowContext) => {
        const note = context.output.generateNote as any;
        
        // Simulate summary generation
        console.log(`Generating summary for note ${note?.noteId}`);
        
        await new Promise(resolve => setTimeout(resolve, 80));
        
        return {
          summary: 'Patient experiencing work-related anxiety with sleep disruption. Continue weekly therapy with stress management focus.',
          keywords: ['anxiety', 'work stress', 'sleep', 'adjustment disorder'],
          sentiment: 'concerned',
        };
      },
      {
        description: 'Generate summary and extract keywords',
      }
    ),
  ],

  onError: async (error: Error, context: FlowContext) => {
    console.error(`Flow ${context.flowId} failed:`, error.message);
    // Could log to error tracking service, send notifications, etc.
  },
};

/**
 * Simplified flow for testing: Just transcribe and summarize
 */
export const quickTranscribeFlow: FlowDefinition = {
  name: 'quickTranscribe',
  description: 'Quick transcription without note generation',
  steps: [
    createStep(
      'transcribe',
      async (context: FlowContext) => {
        const { audioUrl } = context.input;
        console.log(`Quick transcribe: ${audioUrl}`);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        return {
          transcript: 'Quick transcription result',
          language: 'en',
        };
      }
    ),
    
    createStep(
      'summarize',
      async (context: FlowContext) => {
        const transcription = context.output.transcribe as any;
        console.log(`Summarizing: ${transcription?.transcript}`);
        
        return {
          summary: 'Brief summary of the transcription',
          wordCount: 4,
        };
      }
    ),
  ],
};
