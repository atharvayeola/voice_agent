# Voice Agent Webapp

A production-ready web application for interacting with the voice agent platform through your browser. Features real-time voice calls using LiveKit WebRTC, live performance metrics monitoring, and a premium, modern UI.

## Features

### 🎙️ Real-Time Voice Calls
- **Microphone-based calls** directly from your browser
- WebRTC audio streaming via LiveKit
- Full duplex communication with AI agent
- Barge-in support (interrupt the agent while speaking)

### 📊 Live Performance Metrics
Monitor 8 key performance indicators in real-time:
- **Pipeline Latency** - Total round-trip time (target: <600ms)
- **Agent Processing** - LLM reasoning time
- **Average Latency** - Rolling average across all turns
- **Jitter** - Latency variance
- **MOS Score** - Mean Opinion Score (call quality, 1-5 scale)
- **Packet Loss Ratio** - Network quality indicator
- **Barge-in Events** - Number of interruptions
- **Success Rate** - Percentage of successful turns

### 🎨 Premium UI/UX
- Modern glassmorphism design with dark mode
- Vibrant gradient color palette
- Real-time audio visualizer with frequency bars
- Smooth animations and micro-interactions
- Responsive layout for all screen sizes

## Architecture

```
┌─────────────────┐
│   Browser       │
│  (webapp UI)    │
└────────┬────────┘
         │
         ├─ LiveKit WebRTC ──→ LiveKit Cloud/Server
         │
         └─ REST API ──→ Webapp Backend (Express)
                              │
                              ├─ POST /api/calls/start → Creates session + LiveKit token
                              ├─ GET  /api/calls/:id   → Fetch metrics
                              └─ DELETE /api/calls/:id → End session
                              │
                              └─→ Agent Runtime Service
```

## Setup

### Prerequisites
- Node.js >= 20
- pnpm >= 8
- LiveKit server instance (cloud or self-hosted)
- Agent runtime service running

### Configuration

Create a `.env` file (or copy from `.env.example`):

```bash
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Agent Runtime Service
AGENT_RUNTIME_URL=http://localhost:8090

# LiveKit Configuration
LIVEKIT_HOST=wss://your-livekit-instance.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# Optional
LOG_LEVEL=info
```

### Installation

From the repository root:

```bash
# Install dependencies
pnpm install

# Or install just for this service
pnpm --filter @voice-agent/webapp install
```

### Running

**Development mode** (with hot reload):
```bash
# From repo root
pnpm dev:webapp

# Or directly in this directory
pnpm dev
```

**Production build**:
```bash
pnpm build
pnpm start
```

The webapp will be available at `http://localhost:3000`

## Usage

### Starting a Call

1. Open the webapp in your browser (`http://localhost:3000`)
2. Click **"Start Call"** button
3. Grant microphone permissions when prompted
4. Wait for the connection (status will change to "Active")
5. Speak into your microphone to interact with the AI agent
6. Watch real-time metrics update on the dashboard

### During the Call

- **Mute/Unmute**: Click the mute button to toggle your microphone
- **Audio Visualizer**: See your voice levels in real-time
- **Metrics**: Monitor performance metrics as they update every 2 seconds
- **Barge-in**: Interrupt the agent mid-response by speaking

### Ending a Call

Click **"End Call"** to disconnect and clean up the session.

## Development

### Project Structure

```
services/webapp/
├── src/
│   ├── index.ts          # Express server
│   ├── config.ts         # Configuration
│   └── routes/
│       └── calls.ts      # Call management API
├── public/
│   ├── index.html        # Main HTML page
│   ├── styles.css        # Design system & styles
│   ├── app.js            # Main application logic
│   └── livekit-client.js # LiveKit WebRTC wrapper
├── package.json
└── tsconfig.json
```

### API Endpoints

#### `POST /api/calls/start`
Creates a new call session with LiveKit room and token.

**Response:**
```json
{
  "sessionId": "webapp-1234567890-abcd",
  "roomName": "call-webapp-1234567890-abcd",
  "livekitToken": "eyJ...",
  "livekitUrl": "wss://...",
  "userName": "User-1234"
}
```

#### `GET /api/calls/:sessionId`
Fetches real-time metrics for an active session.

**Response:**
```json
{
  "sessionId": "...",
  "bargeInCount": 2,
  "totalTurns": 5,
  "failedTurns": 0,
  "latencyTimeline": [...],
  "lastQualitySample": {
    "jitterMs": 12.5,
    "packetLossRatio": 0.01,
    "mos": 4.3,
    "recordedAt": 1234567890
  }
}
```

#### `DELETE /api/calls/:sessionId`
Ends a call session and cleans up resources.

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires WebRTC support and microphone permissions.

## Troubleshooting

### Microphone Not Working
- Ensure your browser has microphone permissions
- Check system audio settings
- Try a different browser
- Verify HTTPS is enabled (required for WebRTC)

### No Audio from Agent
- Check speaker/headphone connections
- Verify LiveKit connection status
- Check browser console for errors

### Metrics Not Updating
- Ensure agent runtime service is running
- Verify AGENT_RUNTIME_URL is correct
- Check network tab for API errors

### LiveKit Connection Fails
- Verify LIVEKIT_HOST, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET
- Check LiveKit server status
- Ensure firewall allows WebRTC traffic

## Performance

The webapp is optimized for:
- **Sub-600ms latency** for voice agent responses
- **2-second metric refresh** for live monitoring
- **60 FPS audio visualization**
- **Minimal bundle size** using CDN for LiveKit SDK

## License

Part of the Voice Agent Platform project.
