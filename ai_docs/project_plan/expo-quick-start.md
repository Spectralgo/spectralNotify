# Expo Mobile App - Quick Start Guide

## Setup

### 1. Install Dependencies

```bash
cd apps/native
pnpm install
```

### 2. Configure Environment

Create `apps/native/.env`:

```env
# Local development
EXPO_PUBLIC_SERVER_URL=http://localhost:8094

# Production (replace with your worker URL)
# EXPO_PUBLIC_SERVER_URL=https://your-worker.your-subdomain.workers.dev
```

### 3. Start Development Server

**Terminal 1** - Start Cloudflare Worker:
```bash
# From project root
pnpm dev
```

**Terminal 2** - Start Expo:
```bash
# From apps/native
pnpm dev
```

### 4. Open on Device/Emulator

- **iOS Simulator**: Press `i` in Expo terminal
- **Android Emulator**: Press `a` in Expo terminal
- **Physical Device**: Scan QR code with Expo Go app

## Using the App

### First Time Setup

1. **Open the app** - Home screen loads
2. **Sign in** - Use existing account or create new one
3. **Wait for counters** - Counter list loads from API

### Monitoring a Counter

1. **Select a counter** - Tap on any counter in the list
2. **View live updates** - Counter value displays with "Live" badge
3. **Test real-time** - Open web app and increment counter
4. **Watch mobile update** - Mobile app updates instantly!

### Connection Status Indicators

| Badge | Meaning |
|-------|---------|
| 🟢 **Live** | WebSocket connected and receiving updates |
| 🟡 **Connecting...** | Attempting to establish connection |
| 🔴 **Disconnected** | Connection lost, will auto-reconnect |
| 🔴 **Error** | Connection error occurred |

## File Structure

```
apps/native/
├── app/
│   └── (drawer)/
│       └── index.tsx          # Home screen with counter list
├── components/
│   └── live-counter.tsx       # Real-time counter display
├── hooks/
│   └── use-counter-websocket.ts  # WebSocket hook
├── utils/
│   ├── orpc.ts                # oRPC client setup
│   └── websocket.ts           # WebSocket utilities
├── .env                       # Environment variables
└── package.json
```

## Features

### ✅ Real-Time Counter Updates
- Instant updates when counter changes
- No polling required
- Works across all clients (web, mobile)

### ✅ Automatic Reconnection
- Reconnects if connection drops
- 3-second delay between attempts
- Visual feedback during reconnection

### ✅ Keep-Alive
- Ping/pong every 30 seconds
- Prevents connection timeout
- Minimal battery impact

### ✅ Type-Safe API
- Full TypeScript support
- oRPC integration
- TanStack Query caching

## Common Commands

```bash
# Start development server
pnpm dev

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android

# Build for production
expo build:ios
expo build:android

# Clear cache and restart
pnpm dev --clear
```

## Troubleshooting

### Can't Connect to Server

**Problem**: API status shows "API Disconnected"

**Solution**:
1. Verify server is running: `pnpm dev` in project root
2. Check `EXPO_PUBLIC_SERVER_URL` in `.env`
3. For iOS simulator, use `http://localhost:8094`
4. For physical device, use your computer's IP (e.g., `http://192.168.1.100:8094`)

### WebSocket Won't Connect

**Problem**: Connection status stuck on "Connecting..."

**Solution**:
1. Check server URL uses `http://` for local development
2. Verify Cloudflare Worker is running
3. Check network connectivity
4. Try restarting Expo with `pnpm dev --clear`

### No Counters Showing

**Problem**: "No counters found" message

**Solution**:
1. Sign in first (counters require authentication)
2. Create counters from web app
3. Check API connection status
4. Verify oRPC routes are working

### Updates Not Received

**Problem**: Counter value doesn't update in real-time

**Solution**:
1. Check connection status shows "Live" badge
2. Verify you're connected to the correct counter
3. Test by incrementing from web app
4. Check Expo console for WebSocket errors

## Development Tips

### Use with Multiple Devices

1. Get your computer's IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "

   # Windows
   ipconfig
   ```

2. Update `.env`:
   ```env
   EXPO_PUBLIC_SERVER_URL=http://192.168.1.100:8094
   ```

3. Make sure devices are on same network

### Debugging WebSocket

Add console logs in `apps/native/hooks/use-counter-websocket.ts`:

```typescript
wsRef.current = createCounterWebSocket(counterName, {
  onOpen: () => {
    console.log('✅ WebSocket opened');
  },
  onMessage: (message) => {
    console.log('📩 Received:', message);
  },
  onClose: () => {
    console.log('❌ WebSocket closed');
  },
  onError: (error) => {
    console.log('⚠️ WebSocket error:', error);
  },
});
```

### Testing Real-Time Updates

**Setup**:
1. Open web app in browser
2. Open mobile app on device/simulator
3. Select same counter in both

**Test**:
1. Increment counter in web app
2. Watch mobile app update instantly
3. Repeat with decrement, reset, setValue

**Expected**: Mobile app shows new value within 100ms

## Next Steps

### Add Counter Controls to Mobile

Currently, the mobile app is view-only. To add controls:

```tsx
import { useMutation } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

function CounterControls({ counterName }: { counterName: string }) {
  const increment = useMutation(
    orpc.counter.increment.mutationOptions()
  );

  return (
    <View className="flex-row gap-2">
      <TouchableOpacity
        className="rounded-lg bg-primary px-6 py-3"
        onPress={() => increment.mutate({ name: counterName, amount: 1 })}
      >
        <Text className="font-bold text-white">+</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Monitor Multiple Counters

Update state to array:

```tsx
const [selectedCounters, setSelectedCounters] = useState<string[]>([]);

// In render:
{selectedCounters.map(name => (
  <LiveCounter key={name} counterName={name} />
))}
```

### Add Push Notifications

Install expo-notifications:

```bash
pnpm add expo-notifications
```

Configure in hook:

```tsx
import * as Notifications from 'expo-notifications';

useCounterWebSocket("my-counter", {
  onUpdate: async (event) => {
    if (event.value >= 100) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Counter Alert",
          body: `Counter reached ${event.value}!`,
        },
        trigger: null,
      });
    }
  },
});
```

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native WebSocket](https://reactnative.dev/docs/network#websocket-support)
- [oRPC Documentation](https://orpc.unnoq.com/)
- [TanStack Query](https://tanstack.com/query/latest)

## Support

For issues or questions:
1. Check Expo console for errors
2. Review server logs (`pnpm dev` output)
3. Check network connectivity
4. Verify environment variables
5. Try clearing cache: `pnpm dev --clear`

---

**You're ready to monitor counters in real-time from your mobile device! 🎉**
