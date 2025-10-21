import { useState } from 'react';
import { startFlow, noteCreationFlow, quickTranscribeFlow, FlowResult, StepResult } from '@mscribe/flows';
import './App.css';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

function App() {
  const [executing, setExecuting] = useState(false);
  const [steps, setSteps] = useState<StepResult[]>([]);
  const [flowResult, setFlowResult] = useState<FlowResult | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [
      ...prev,
      { timestamp: new Date().toISOString(), message, type },
    ]);
  };

  const executeFlow = async (flowName: 'note' | 'quick') => {
    setExecuting(true);
    setSteps([]);
    setFlowResult(null);
    setLogs([]);

    const flow = flowName === 'note' ? noteCreationFlow : quickTranscribeFlow;
    const input = flowName === 'note' 
      ? { 
          sessionId: 'session-demo-123',
          patientId: 'patient-demo-456',
          audioUrl: 'https://example.com/audio.mp3'
        }
      : {
          audioUrl: 'https://example.com/quick-audio.mp3'
        };

    addLog(`Starting flow: ${flow.name}`, 'info');

    try {
      // Subscribe to flow execution
      startFlow(flow, input, { userId: 'playground-user' }).subscribe({
        next: (event) => {
          if ('flowName' in event) {
            // This is a FlowResult
            const result = event as FlowResult;
            setFlowResult(result);
            setSteps(result.steps);
            addLog(
              `Flow ${result.status}: ${result.flowName} completed in ${result.durationMs}ms`,
              result.status === 'completed' ? 'success' : 'error'
            );
          } else {
            // This is an event
            addLog(`Event: ${event.type}`, 'info');
          }
        },
        error: (error) => {
          addLog(`Flow error: ${error.message}`, 'error');
          setExecuting(false);
        },
        complete: () => {
          addLog('Flow execution complete', 'success');
          setExecuting(false);
        },
      });
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`, 'error');
      setExecuting(false);
    }
  };

  return (
    <div className="app">
      <div className="header">
        <h1>🔬 Mental Scribe Flow Playground</h1>
        <p>Test and debug flow orchestration in real-time</p>
      </div>

      <div className="flow-selector">
        <h2>Select Flow to Execute</h2>
        <div className="flow-buttons">
          <button
            className="flow-button"
            onClick={() => executeFlow('note')}
            disabled={executing}
          >
            📝 Note Creation Flow
          </button>
          <button
            className="flow-button"
            onClick={() => executeFlow('quick')}
            disabled={executing}
          >
            ⚡ Quick Transcribe
          </button>
        </div>
      </div>

      {steps.length > 0 && (
        <div className="execution-panel">
          <h2>Flow Execution</h2>
          {steps.map((step, index) => (
            <div key={index} className={`step ${step.status}`}>
              <div className="step-header">
                <span className="step-name">
                  {index + 1}. {step.step}
                </span>
                <span className={`step-status ${step.status}`}>
                  {step.status}
                </span>
              </div>
              <div className="step-details">
                Duration: {step.durationMs}ms
                {step.error && (
                  <div style={{ color: '#cc0000', marginTop: '0.5rem' }}>
                    Error: {step.error}
                  </div>
                )}
              </div>
              {step.data && (
                <div className="step-data">
                  <pre>{JSON.stringify(step.data, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {flowResult && (
        <div className="flow-result">
          <h3>Flow Result</h3>
          <div className="result-summary">
            <div className="result-item">
              <div className="result-label">Flow ID</div>
              <div className="result-value">{flowResult.flowId}</div>
            </div>
            <div className="result-item">
              <div className="result-label">Status</div>
              <div className="result-value" style={{ 
                color: flowResult.status === 'completed' ? '#00cc66' : '#cc0000' 
              }}>
                {flowResult.status}
              </div>
            </div>
            <div className="result-item">
              <div className="result-label">Total Duration</div>
              <div className="result-value">{flowResult.durationMs}ms</div>
            </div>
            <div className="result-item">
              <div className="result-label">Steps Completed</div>
              <div className="result-value">
                {flowResult.steps.filter(s => s.status === 'completed').length} / {flowResult.steps.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="logs">
          <h3 style={{ marginBottom: '1rem', color: '#d4d4d4' }}>Console Logs</h3>
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              <span className="log-time">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span style={{ 
                color: log.type === 'error' ? '#ff6b6b' : 
                       log.type === 'success' ? '#51cf66' : '#d4d4d4' 
              }}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
