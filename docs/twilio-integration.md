# Twilio Phone Integration Guide

This guide shows you how to enable real PSTN phone calls to your Voice Agent platform.

## 🎯 What You'll Get

- ✅ **Inbound Calls**: People can call a phone number and talk to your AI agent
- ✅ **Outbound Calls**: Your system can call users programmatically
- ✅ **Full Voice Conversation**: Real phone calls, not just web interface
- ✅ **Production Ready**: Same backend you already have, just needs configuration

## 📋 Prerequisites

### 1. Twilio Account Setup

**Sign up for Twilio:**
- Visit: https://www.twilio.com/try-twilio
- Get **$15 free credit** on trial account
- Verify your email and phone number

**Get Your Credentials:**
After signing up, you'll see your dashboard with:
- **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Auth Token**: (click "View" to reveal)

### 2. Buy a Phone Number

**Steps:**
1. In Twilio Console → Phone Numbers → Buy a Number
2. Choose country (e.g., United States)
3. Select "Voice" capability
4. Cost: ~$1-2/month
5. Note down your number: `+1234567890`

### 3. Configure Environment Variables

Create/update `.env` file in repo root:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# LiveKit (if not already set)
LIVEKIT_HOST=http://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret

# Agent Runtime
AGENT_RUNTIME_URL=http://localhost:8090
```

## 🚀 Quick Start

### Option 1: Local Testing (Ngrok Required)

Twilio needs a public URL to send webhooks. Use ngrok to expose your local server:

```bash
# 1. Install ngrok
brew install ngrok

# 2. Start your gateway service
docker compose -f infra/docker-compose.yml up gateway -d

# 3. Expose gateway to internet
ngrok http 8080

# You'll get a URL like: https://abc123.ngrok.io
```

**Configure Twilio Webhook:**
1. Go to Twilio Console → Phone Numbers → Your Number
2. Under "Voice & Fax" → "A Call Comes In"
3. Set to: `https://your-ngrok-url.ngrok.io/twilio/voice`
4. Method: `POST`
5. Save

**Test It:**
```bash
# Call your Twilio number from any phone
# Your AI agent will answer!
```

### Option 2: Deploy to Production

**Using Railway/Render/Fly.io:**

```bash
# Deploy gateway service
railway up

# Get your production URL
# e.g., https://voice-agent-gateway.up.railway.app
```

**Configure Twilio:**
- Webhook URL: `https://your-production-url.com/twilio/voice`

---

## 📞 Making Outbound Calls

### Via API

**Start an outbound call:**

```bash
curl -X POST http://localhost:8080/api/calls/outbound \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "greeting": "Hello! This is your AI assistant calling."
  }'
```

**Response:**
```json
{
  "callSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "initiated",
  "phoneNumber": "+1234567890"
}
```

### Via Webapp

Add an "Outbound Call" button to the webapp:

```html
<!-- In webapp UI -->
<button onclick="makeOutboundCall()">Call User</button>

<script>
async function makeOutboundCall() {
  const phoneNumber = prompt('Enter phone number (e.g., +1234567890):');
  
  const response = await fetch('/api/calls/outbound', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber })
  });
  
  const result = await response.json();
  alert(`Call initiated! SID: ${result.callSid}`);
}
</script>
```

---

## 🔧 How It Works

### Inbound Call Flow

```
1. User dials Twilio number
2. Twilio → POST /twilio/voice webhook
3. Gateway creates LiveKit room
4. Agent joins room
5. Agent Runtime processes conversation
6. STT converts speech → text
7. LLM generates response
8. TTS converts text → speech
9. Audio streams back to caller
```

### Architecture

```
┌─────────────┐
│   Caller    │
└──────┬──────┘
       │ PSTN
       ↓
┌─────────────┐
│   Twilio    │
└──────┬──────┘
       │ Webhook
       ↓
┌─────────────┐
│   Gateway   │ ← Creates LiveKit room
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   LiveKit   │ ← Media server
└──────┬──────┘
       │
       ↓
┌─────────────────────────┐
│  Agent Runtime + Agent  │ ← AI processing
└─────────────────────────┘
```

---

## 📊 Monitoring Calls

### Check Call Status

```bash
curl http://localhost:8080/api/calls/{callSid}
```

### View Active Calls

```bash
curl http://localhost:8090/api/sessions
```

### Twilio Dashboard

- View all calls: Console → Voice → Calls → Logs
- See recordings, transcripts, costs

---

## 💰 Pricing

**Twilio Costs (Pay-as-you-go):**
- Phone number: $1-2/month
- Inbound calls: $0.0085/min
- Outbound calls: $0.013/min
- Total for 100 min/month: ~$2-3

**Free alternatives for testing:**
- Use Twilio trial (restricted to verified numbers)
- Use ngrok free tier for webhooks

---

## 🐛 Troubleshooting

### Webhook Not Receiving Calls

**Check:**
```bash
# Test webhook manually
curl -X POST https://your-ngrok-url.ngrok.io/twilio/voice \
  -d "CallSid=CAtest123" \
  -d "From=+1234567890"
```

**Common issues:**
- Ngrok tunnel expired (restart it)
- Gateway not running
- Wrong webhook URL in Twilio

### No Audio on Call

**Verify:**
- LiveKit is running: `docker ps | grep livekit`
- STT/TTS services are running
- Agent service is responding

### Agent Not Responding

**Check logs:**
```bash
docker logs infra-gateway-1 --tail 50
docker logs infra-agent-runtime-1 --tail 50
```

---

## 🎯 Next Steps

1. **Get Twilio credentials** (5 min)
2. **Configure webhook with ngrok** (5 min)
3. **Call your number** (instant!)
4. **Test conversation** (watch metrics in webapp)

**Need the credentials?** Just provide:
- Account SID
- Auth Token  
- Phone Number

And I'll configure everything for you! 📞✨
