# Example Usage

This document shows practical examples of using @spectralnotify/client in different scenarios.

## Complete Application Example

```tsx
// app.tsx
import { SpectralNotifyProvider } from '@spectralnotify/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkflowDashboard } from './components/WorkflowDashboard';

const queryClient = new QueryClient();

function App() {
  return (
    <SpectralNotifyProvider
      config={{
        serverUrl: import.meta.env.VITE_SPECTRAL_NOTIFY_URL || 'http://localhost:8094',
        credentials: 'include',
      }}
    >
      <WorkflowDashboard />
    </SpectralNotifyProvider>
  );
}

export default App;
```

## Workflow Dashboard Component

```tsx
// components/WorkflowDashboard.tsx
import { useState } from 'react';
import { useWorkflow } from '@spectralnotify/client';

export function WorkflowDashboard() {
  const [workflowId, setWorkflowId] = useState('');
  const [selectedId, setSelectedId] = useState<string>();

  const {
    workflow,
    isLoading,
    isConnected,
    isError,
    error,
    refetch,
    reconnect,
    disconnect,
  } = useWorkflow({
    workflowId: selectedId,
    onWebSocketUpdate: (event) => {
      console.log('Workflow update:', event);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedId(workflowId);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>SpectralNotify Workflow Monitor</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={workflowId}
          onChange={(e) => setWorkflowId(e.target.value)}
          placeholder="Enter workflow ID"
          style={{ padding: '8px', marginRight: '8px', width: '300px' }}
        />
        <button type="submit" style={{ padding: '8px 16px' }}>
          Load Workflow
        </button>
      </form>

      {isLoading && <div>Loading workflow data...</div>}

      {isError && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          <p>Error: {error?.message}</p>
          <button onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {workflow && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h2>
              Workflow: {workflow.id}
              <span
                style={{
                  marginLeft: '10px',
                  fontSize: '16px',
                  color: isConnected ? 'green' : 'gray',
                }}
              >
                {isConnected ? '🟢 Live' : '🔴 Disconnected'}
              </span>
            </h2>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
              <div>
                <strong>Status:</strong>{' '}
                <span
                  style={{
                    color:
                      workflow.status === 'success'
                        ? 'green'
                        : workflow.status === 'failed'
                          ? 'red'
                          : workflow.status === 'in-progress'
                            ? 'blue'
                            : 'gray',
                  }}
                >
                  {workflow.status}
                </span>
              </div>
              <div>
                <strong>Progress:</strong> {workflow.overallProgress}%
              </div>
              <div>
                <strong>Phases:</strong> {workflow.completedPhaseCount} /{' '}
                {workflow.expectedPhaseCount}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => refetch()}>Refresh Data</button>
              {isConnected ? (
                <button onClick={() => disconnect()}>Disconnect</button>
              ) : (
                <button onClick={() => reconnect()}>Reconnect</button>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
            }}
          >
            <div>
              <h3>Phases</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {workflow.phases.map((phase) => (
                  <div
                    key={phase.key}
                    style={{
                      border: '1px solid #ccc',
                      padding: '10px',
                      borderRadius: '4px',
                      backgroundColor:
                        phase.status === 'in-progress' ? '#e3f2fd' : 'white',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{phase.label}</strong>
                      <span
                        style={{
                          color:
                            phase.status === 'success'
                              ? 'green'
                              : phase.status === 'failed'
                                ? 'red'
                                : phase.status === 'in-progress'
                                  ? 'blue'
                                  : 'gray',
                        }}
                      >
                        {phase.status}
                      </span>
                    </div>
                    <div style={{ marginTop: '5px' }}>
                      <div
                        style={{
                          height: '8px',
                          backgroundColor: '#e0e0e0',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${phase.progress}%`,
                            backgroundColor:
                              phase.status === 'success'
                                ? 'green'
                                : phase.status === 'failed'
                                  ? 'red'
                                  : 'blue',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                      <div style={{ marginTop: '5px', fontSize: '12px' }}>
                        Progress: {phase.progress}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3>Event Timeline</h3>
              <div
                style={{
                  maxHeight: '600px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {workflow.events.map((event) => (
                  <div
                    key={event.id}
                    style={{
                      border: '1px solid #eee',
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  >
                    <div
                      style={{
                        color: '#666',
                        fontSize: '12px',
                        marginBottom: '4px',
                      }}
                    >
                      {event.timestamp.toLocaleString()}
                      {event.phaseKey && ` - ${event.phaseKey}`}
                    </div>
                    <div>{event.message}</div>
                    {event.progress !== undefined && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Progress: {event.progress}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Task Monitor Component

```tsx
// components/TaskMonitor.tsx
import { useState } from 'react';
import { useTask } from '@spectralnotify/client';

export function TaskMonitor() {
  const [taskId, setTaskId] = useState('');
  const [selectedId, setSelectedId] = useState<string>();

  const {
    task,
    isLoading,
    isConnected,
    isError,
    error,
  } = useTask({
    taskId: selectedId,
    onWebSocketUpdate: (event) => {
      if (event.type === 'complete') {
        alert(`Task ${event.taskId} completed!`);
      } else if (event.type === 'fail') {
        alert(`Task ${event.taskId} failed: ${event.error}`);
      }
    },
  });

  return (
    <div style={{ padding: '20px' }}>
      <h1>Task Monitor</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSelectedId(taskId);
        }}
      >
        <input
          type="text"
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          placeholder="Enter task ID"
        />
        <button type="submit">Load Task</button>
      </form>

      {isLoading && <div>Loading...</div>}
      {isError && <div>Error: {error?.message}</div>}

      {task && (
        <div>
          <h2>{task.id}</h2>
          <p>Status: {task.status}</p>
          <p>Progress: {task.progress}%</p>
          <p>Connected: {isConnected ? '✅' : '❌'}</p>

          <h3>Events</h3>
          {task.events.map((event) => (
            <div key={event.id}>
              {event.timestamp.toLocaleString()} - {event.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Multiple Workflows Dashboard

```tsx
// components/MultiWorkflowDashboard.tsx
import { useWorkflow } from '@spectralnotify/client';

interface WorkflowCardProps {
  workflowId: string;
}

function WorkflowCard({ workflowId }: WorkflowCardProps) {
  const { workflow, isLoading, isConnected } = useWorkflow({ workflowId });

  if (isLoading) return <div>Loading...</div>;
  if (!workflow) return null;

  return (
    <div
      style={{
        border: '1px solid #ccc',
        padding: '16px',
        borderRadius: '8px',
        minWidth: '300px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h3>{workflow.id}</h3>
        <span>{isConnected ? '🟢' : '🔴'}</span>
      </div>
      <p>Status: {workflow.status}</p>
      <p>Progress: {workflow.overallProgress}%</p>
      <div
        style={{
          height: '8px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${workflow.overallProgress}%`,
            backgroundColor: 'blue',
          }}
        />
      </div>
    </div>
  );
}

export function MultiWorkflowDashboard() {
  const workflowIds = ['workflow-1', 'workflow-2', 'workflow-3'];

  return (
    <div style={{ padding: '20px' }}>
      <h1>All Workflows</h1>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {workflowIds.map((id) => (
          <WorkflowCard key={id} workflowId={id} />
        ))}
      </div>
    </div>
  );
}
```

## With Notifications

```tsx
// components/WorkflowWithNotifications.tsx
import { useEffect } from 'react';
import { useWorkflow } from '@spectralnotify/client';
import { toast } from 'sonner'; // or your toast library

export function WorkflowWithNotifications({ workflowId }: { workflowId: string }) {
  const { workflow, isConnected, lastUpdate } = useWorkflow({
    workflowId,
    onWebSocketUpdate: (event) => {
      switch (event.type) {
        case 'phase-progress':
          toast.info(`Phase ${event.phase}: ${event.progress}%`);
          break;
        case 'complete':
          toast.success('Workflow completed!');
          break;
        case 'fail':
          toast.error(`Workflow failed: ${event.error}`);
          break;
      }
    },
  });

  useEffect(() => {
    if (lastUpdate) {
      console.log('Workflow updated at:', lastUpdate);
    }
  }, [lastUpdate]);

  return (
    <div>
      <h2>{workflow?.id}</h2>
      <p>Status: {workflow?.status}</p>
      <p>Connected: {isConnected ? '✅' : '❌'}</p>
    </div>
  );
}
```

## Environment Configuration

```env
# .env
VITE_SPECTRAL_NOTIFY_URL=https://your-server.com

# For API key authentication
VITE_SPECTRAL_NOTIFY_API_KEY=your-api-key-here
```

```tsx
// app.tsx with environment variables
import { SpectralNotifyProvider } from '@spectralnotify/client';

function App() {
  return (
    <SpectralNotifyProvider
      config={{
        serverUrl: import.meta.env.VITE_SPECTRAL_NOTIFY_URL,
        headers: import.meta.env.VITE_SPECTRAL_NOTIFY_API_KEY
          ? {
              'X-API-Key': import.meta.env.VITE_SPECTRAL_NOTIFY_API_KEY,
            }
          : undefined,
      }}
    >
      <YourApp />
    </SpectralNotifyProvider>
  );
}
```
