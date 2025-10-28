# 🚀 Quick Start: Expo Mobile App

Your IP address: **192.168.1.60**

## ✅ Configuration Complete

The following files have been configured:

- ✅ `apps/native/.env` → `EXPO_PUBLIC_SERVER_URL=http://192.168.1.60:8094`
- ✅ `apps/server/.env` → `BETTER_AUTH_URL=http://192.168.1.60:8094`
- ✅ `apps/server/.env` → `CORS_ORIGIN=*` (allows Expo to connect)

## 📱 Start Development

Open **TWO terminal windows**:

### Terminal 1: Start Server & Web

```bash
# From project root
pnpm dev
```

**Expected output:**
```
Web    -> http://localhost:3014
Server -> http://localhost:8094
```

### Terminal 2: Start Expo

```bash
# From project root
cd apps/native
pnpm dev
```

**Expected output:**
```
› Metro waiting on exp://192.168.1.60:8081
› Scan the QR code above with Expo Go (Android) or Camera app (iOS)
```

## 📲 Connect Your Phone

### Option 1: Physical Device (Recommended)

1. **Install Expo Go** on your phone:
   - iOS: App Store → Search "Expo Go"
   - Android: Google Play → Search "Expo Go"

2. **Make sure phone is on SAME Wi-Fi as your computer**

3. **Scan QR code** from Terminal 2:
   - iOS: Use Camera app
   - Android: Use Expo Go app scanner

### Option 2: iOS Simulator (Mac only)

In Terminal 2, press `i`

### Option 3: Android Emulator

In Terminal 2, press `a`

## ✅ Verify Everything Works

1. **App Opens** → Should see "SPECTRAL NOTIFY" title
2. **API Status** → Green indicator: "Connected to API"
3. **Sign In** → Use your email: florian.renard@spectralgo.com
4. **Counter List** → Should load counters from server
5. **Select Counter** → Tap any counter
6. **WebSocket** → Green "Live" badge appears
7. **Real-Time Test**:
   - Open web at `http://localhost:3014`
   - Sign in
   - Increment same counter
   - **Mobile updates instantly!** ✨

## 🔧 Troubleshooting

### "API Disconnected" on Mobile

**Check:**
```bash
# 1. Is server running?
curl http://192.168.1.60:8094
# Should return: OK

# 2. Is phone on same Wi-Fi?
# Settings → Wi-Fi → Check network name matches computer's

# 3. Try ping from phone browser:
# Open Safari/Chrome → http://192.168.1.60:8094
# Should show: OK
```

### "WebSocket Won't Connect"

**Check:**
```bash
# 1. Restart server (Terminal 1)
# Press Ctrl+C, then run again:
pnpm dev

# 2. Clear Expo cache (Terminal 2)
pnpm dev --clear
```

### "Cannot find module"

```bash
cd apps/native
pnpm install
pnpm dev --clear
```

## 🌐 Access URLs

| Service | URL | Access From |
|---------|-----|-------------|
| API | `http://192.168.1.60:8094` | Phone, Browser |
| Web App | `http://localhost:3014` | Browser (same computer) |
| WebSocket | `ws://192.168.1.60:8094/ws/counter/:name` | Mobile app |

## 🎯 Quick Test Sequence

1. **Start servers** (both terminals)
2. **Open Expo Go** on phone
3. **Scan QR code**
4. **Wait for app to load** (~30 seconds first time)
5. **Check green API indicator**
6. **Sign in**
7. **Select a counter**
8. **See "Live" badge** 🟢
9. **Open web** → Increment counter
10. **Watch mobile update** instantly!

## 💡 Pro Tips

### Keep Terminal 1 Running
The server must stay running for both web and mobile to work.

### IP Address Changed?
If you connect to different Wi-Fi, your IP might change. Check with:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Then update `apps/native/.env` with new IP.

### Stop Servers
Press `Ctrl+C` in both terminals.

### View Logs
All logs appear in the terminal windows. Watch for:
- Terminal 1: API requests, WebSocket connections
- Terminal 2: Expo/Metro bundler, React errors

## 🎉 You're Ready!

Everything is configured for your IP: **192.168.1.60**

Just run both terminals and connect your phone!
