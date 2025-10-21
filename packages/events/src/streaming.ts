import { Observable, share } from 'rxjs';
import { MScribeEvent, isMScribeEvent } from './types.js';

/**
 * Convert a Server-Sent Events stream into an Observable of typed events
 * 
 * @param url - Edge function URL
 * @param options - Fetch options (headers, body, etc.)
 * @returns Observable that emits typed MScribe events
 * 
 * @example
 * ```typescript
 * streamEdgeFunction('https://project.supabase.co/functions/v1/generate-note', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ sessionId: '123' })
 * }).subscribe({
 *   next: (event) => {
 *     if (event.type === 'text_message_delta') {
 *       console.log('Delta:', event.delta);
 *     }
 *   },
 *   error: (err) => console.error('Stream error:', err),
 *   complete: () => console.log('Stream complete')
 * });
 * ```
 */
export function streamEdgeFunction(
  url: string,
  options?: RequestInit
): Observable<MScribeEvent> {
  return new Observable<MScribeEvent>((subscriber) => {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let aborted = false;

    const cleanup = () => {
      aborted = true;
      if (reader) {
        reader.cancel().catch(() => {
          // Ignore cancellation errors
        });
      }
    };

    (async () => {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            Accept: 'text/event-stream',
          },
        });

        if (!response.ok) {
          throw new Error(
            `Edge function returned ${response.status}: ${response.statusText}`
          );
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!aborted) {
          const { done, value } = await reader.read();

          if (done) {
            subscriber.complete();
            break;
          }

          // Decode chunk and append to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            const data = line.slice(6); // Remove "data: " prefix

            // Handle SSE keep-alive
            if (data === '[DONE]') {
              subscriber.complete();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (isMScribeEvent(parsed)) {
                subscriber.next(parsed);
              } else {
                console.warn('Received invalid event:', parsed);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', data, parseError);
            }
          }
        }
      } catch (error) {
        if (!aborted) {
          subscriber.error(error);
        }
      }
    })();

    // Return cleanup function
    return cleanup;
  }).pipe(share()); // Share subscription among multiple subscribers
}

/**
 * Stream events from an EventSource (alternative to fetch-based streaming)
 * Useful for reconnecting streams or when browser EventSource is preferred
 * 
 * @param url - Edge function URL
 * @returns Observable that emits typed MScribe events
 */
export function streamFromEventSource(url: string): Observable<MScribeEvent> {
  return new Observable<MScribeEvent>((subscriber) => {
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        subscriber.complete();
        return;
      }

      try {
        const parsed = JSON.parse(event.data);
        if (isMScribeEvent(parsed)) {
          subscriber.next(parsed);
        }
      } catch (error) {
        console.warn('Failed to parse EventSource data:', event.data, error);
      }
    };

    eventSource.onerror = (error) => {
      subscriber.error(error);
      eventSource.close();
    };

    // Cleanup: close EventSource when unsubscribed
    return () => {
      eventSource.close();
    };
  }).pipe(share());
}
