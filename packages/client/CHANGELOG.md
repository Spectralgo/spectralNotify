# Changelog

All notable changes to the @spectralnotify/client package will be documented in this file.

## [0.1.0] - 2025-01-30

### Added
- Initial release of @spectralnotify/client
- React hooks for workflow and task monitoring: `useWorkflow`, `useTask`
- Context provider: `SpectralNotifyProvider`
- Real-time WebSocket support with automatic reconnection
- REST API client (fetch-based, no oRPC dependency)
- Full TypeScript support with comprehensive type definitions
- Automatic query cache updates from WebSocket events
- TanStack Query integration for optimal caching
- ESM and CJS module formats
- Comprehensive documentation and examples

### Features
- **useWorkflow Hook**: Subscribe to workflow updates with real-time WebSocket support
- **useTask Hook**: Subscribe to task updates with real-time WebSocket support
- **Auto-reconnection**: Automatic reconnection with configurable intervals
- **Keep-alive**: Ping/pong mechanism to keep connections alive
- **Cache Management**: Smart query cache updates from WebSocket events
- **Type Safety**: Full TypeScript definitions for all APIs
- **Portable**: No oRPC dependency, uses standard fetch and WebSocket APIs
