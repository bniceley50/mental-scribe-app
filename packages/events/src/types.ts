/**
 * Base event type for all Mental Scribe events
 * Every event must have a type identifier and timestamp
 */
export interface BaseEvent {
  /** Event type discriminator */
  type: string;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Edge function run lifecycle events
 */
export interface RunStartedEvent extends BaseEvent {
  type: 'run_started';
  runId: string;
  functionName: string;
}

export interface RunFinishedEvent extends BaseEvent {
  type: 'run_finished';
  runId: string;
  functionName: string;
  status: 'success' | 'error';
  error?: string;
}

/**
 * Streaming text events for GPT-4 responses
 */
export interface TextMessageDelta extends BaseEvent {
  type: 'text_message_delta';
  delta: string;
  runId: string;
}

export interface TextMessageComplete extends BaseEvent {
  type: 'text_message_complete';
  fullText: string;
  runId: string;
}

/**
 * Audio transcription events
 */
export interface TranscriptionStarted extends BaseEvent {
  type: 'transcription_started';
  audioId: string;
  durationSeconds?: number;
}

export interface TranscriptionComplete extends BaseEvent {
  type: 'transcription_complete';
  audioId: string;
  transcript: string;
  language?: string;
}

export interface TranscriptionError extends BaseEvent {
  type: 'transcription_error';
  audioId: string;
  error: string;
}

/**
 * Clinical note events
 */
export interface NoteGenerated extends BaseEvent {
  type: 'note_generated';
  noteId: string;
  content: string;
  patientId: string;
}

export interface NoteSaved extends BaseEvent {
  type: 'note_saved';
  noteId: string;
  sessionId: string;
}

/**
 * Audit events
 */
export interface AuditEntryCreated extends BaseEvent {
  type: 'audit_entry_created';
  action: string;
  resource: string;
  resourceId: string;
  actorId: string;
}

/**
 * Error events
 */
export interface ErrorEvent extends BaseEvent {
  type: 'error';
  error: string;
  code?: string;
  context?: Record<string, unknown>;
}

/**
 * Union type of all Mental Scribe events
 */
export type MScribeEvent =
  | RunStartedEvent
  | RunFinishedEvent
  | TextMessageDelta
  | TextMessageComplete
  | TranscriptionStarted
  | TranscriptionComplete
  | TranscriptionError
  | NoteGenerated
  | NoteSaved
  | AuditEntryCreated
  | ErrorEvent;

/**
 * Type guard to check if a value is a valid MScribe event
 */
export function isMScribeEvent(value: unknown): value is MScribeEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Partial<BaseEvent>;
  return typeof event.type === 'string' && typeof event.timestamp === 'string';
}

/**
 * Create a base event with timestamp
 */
export function createEvent<T extends BaseEvent>(
  type: T['type'],
  data: Omit<T, 'type' | 'timestamp'>
): T {
  return {
    type,
    timestamp: new Date().toISOString(),
    ...data,
  } as T;
}
