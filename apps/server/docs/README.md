# SpectralNotify Documentation

Welcome to the SpectralNotify documentation. This system provides real-time task tracking and notifications using Cloudflare Durable Objects and WebSockets.

## 📚 Documentation Index

### Quick Start
- **[API Endpoints Summary](./API_ENDPOINTS_SUMMARY.md)** - Quick reference for all endpoints (START HERE)
- **[SpectralTranscript Integration](./integration/SPECTRAL_TRANSCRIPT_INTEGRATION.md)** - Production integration guide with idempotency

### Detailed Guides
- **[API Reference](./api/README.md)** - Complete API documentation
- **[Integration Guide](./integration/README.md)** - REST endpoint integration (debugging only)

## 🚨 Important: Which Endpoint Should You Use?

### For Production Integrations
**Use `/rpc` endpoint** - Get full idempotency support with `__idempotency` metadata:
```bash
POST http://localhost:8094/rpc
```
→ Read: [SpectralTranscript Integration Guide](./integration/SPECTRAL_TRANSCRIPT_INTEGRATION.md)

### For Quick Debugging
**Use `/tasks/*` REST endpoints** - Simple HTTP POST (NO idempotency):
```bash
POST http://localhost:8094/tasks/create
```
→ Read: [Integration Guide](./integration/README.md)

### API Documentation UI
**Open `/api-reference`** - Interactive OpenAPI documentation:
```bash
http://localhost:8094/api-reference
```

## 🎯 Common Use Cases

### I want to integrate SpectralTranscript with idempotency
→ [SpectralTranscript Integration Guide](./integration/SPECTRAL_TRANSCRIPT_INTEGRATION.md)

### I want to quickly test endpoints with curl
→ [API Endpoints Summary](./API_ENDPOINTS_SUMMARY.md) (REST section)

### I want to understand all available operations
→ [API Reference](./api/README.md)

### I want to build a monitoring dashboard
→ [Integration Guide](./integration/README.md) (WebSocket section)

### I want TypeScript types for the API
→ [SpectralTranscript Integration Guide](./integration/SPECTRAL_TRANSCRIPT_INTEGRATION.md) (oRPC client section)

## 🔑 Key Concepts

### Idempotency
SpectralNotify provides automatic idempotency for mutation operations via:
- Required `Idempotency-Key` header
- 24-hour cache expiration
- `__idempotency` metadata in responses
- **Only works with `/rpc` endpoint**

### Authentication
All endpoints require API key authentication:
```bash
X-API-Key: your-api-key-here
```

### Real-Time Updates
Connect to WebSocket endpoints for live task updates:
```
ws://localhost:8094/ws/task/:taskId
ws://localhost:8094/ws/counter/:name
```

## 📖 Architecture

### Three API Surfaces

1. **RPC Endpoint** (`/rpc`)
   - oRPC protocol
   - Full middleware support
   - Idempotency included
   - TypeScript client available

2. **REST Endpoints** (`/tasks/*`, `/counter/*`)
   - Standard HTTP POST
   - OpenAPI-compliant
   - NO middleware support
   - Good for debugging

3. **Documentation UI** (`/api-reference`)
   - Interactive OpenAPI docs
   - Try-it-out functionality
   - Schema explorer

### Data Flow

```
Client Request
     ↓
[Auth Middleware] → Validate API Key
     ↓
[Handler Selection]
     ├─→ /rpc → [Idempotency Middleware] → [Handler] → Response with __idempotency
     ├─→ /tasks/* → [Handler] → Response (no idempotency)
     └─→ /api-reference → [OpenAPI UI]
```

## 🛠️ Development

### Local Setup
```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Server runs at:
# http://localhost:8094
```

### Environment Variables
```bash
# apps/server/.env
SPECTRAL_NOTIFY_API_KEY=local-dev-key
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:8094
CORS_ORIGIN=http://localhost:3020
ALLOWED_EMAIL=admin@example.com
```

### Testing Endpoints

#### Test RPC (with idempotency)
```bash
curl -X POST http://localhost:8094/rpc \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-key" \
  -H "Idempotency-Key: test-001" \
  -d '{"method":"tasks.create","params":{"id":"test","status":"pending","metadata":{}}}'
```

#### Test REST (no idempotency)
```bash
curl -X POST http://localhost:8094/tasks/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-key" \
  -d '{"id":"test","status":"pending","metadata":{}}'
```

## 📊 Monitoring

### Server Logs
Watch for these log patterns:
- `[Idempotency]` - Idempotency middleware activity
- `[Auth]` - Authentication events
- `[Middleware]` - Request processing
- `[NotifyBroker]` - External integration calls

### Idempotency Metrics
Monitor cache hit rates:
```typescript
// In your client
const hitRate = (cacheHits / (cacheHits + cacheMisses)) * 100;
console.log(`Cache hit rate: ${hitRate.toFixed(1)}%`);
```

## 🐛 Troubleshooting

### 404 Not Found
- ✅ Check URL format: `/rpc` or `/tasks/create` (not `/tasks.create`)
- ✅ Verify server is running on port 8094
- ✅ Check for typos in endpoint path

### 401 Unauthorized
- ✅ Include `X-API-Key` header
- ✅ Verify API key matches `SPECTRAL_NOTIFY_API_KEY` env var
- ✅ Check server logs for key validation messages

### No `__idempotency` in Response
- ⚠️ You're using `/tasks/*` REST endpoints (they don't support idempotency)
- ✅ Switch to `/rpc` endpoint
- ✅ Use RPC format: `{"method":"tasks.create","params":{...}}`

### Idempotency Not Working
- ✅ Verify using `/rpc` endpoint (not `/tasks/*`)
- ✅ Check `Idempotency-Key` header is present
- ✅ Look for `[Idempotency]` logs in server output
- ✅ Ensure deterministic key generation (same operation = same key)

## 🔗 External Resources

- [oRPC Documentation](https://orpc.unnoq.com/)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Better Auth](https://www.better-auth.com/)

## 📝 Contributing

When adding new features:
1. Update relevant documentation
2. Add examples to integration guides
3. Test with both `/rpc` and REST endpoints
4. Update [API Endpoints Summary](./API_ENDPOINTS_SUMMARY.md)

## 📄 License

See project root for license information.
