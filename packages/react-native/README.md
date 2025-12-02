# @spectralnotify/react-native

React Native client library for SpectralNotify workflow and task updates with real-time WebSocket support.

## Installation

```bash
pnpm add @spectralnotify/react-native
```

## Usage

```tsx
import { SpectralNotifyProvider, useWorkflow, useTask } from '@spectralnotify/react-native';

// Wrap your app with the provider
function App() {
  return (
    <SpectralNotifyProvider config={{ baseUrl: 'https://your-api.com' }}>
      <YourApp />
    </SpectralNotifyProvider>
  );
}

// Use hooks in your components
function WorkflowComponent() {
  const { workflow, isLoading } = useWorkflow('workflow-id');
  
  return <Text>{workflow?.status}</Text>;
}
```

## Features

- Real-time workflow and task updates via WebSocket
- Connection state tracking (`disconnected` | `connecting` | `connected`)
- React Query integration for caching and synchronization
- TypeScript support with full type definitions
- Optimized for React Native and Expo

## Documentation

See the main [SpectralNotify documentation](../../README.md) for more details.

## License

MIT
