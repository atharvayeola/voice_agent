# STT Service

Streaming speech-to-text adapter with partial transcripts, endpointing, and latency instrumentation.

## Running Locally

```bash
pnpm --filter @voice-agent/stt dev
```

`POST /v1/transcribe` accepts either `text` or base64-encoded `audio` and returns deterministic segments with timestamps and confidence scores. The service defaults to port `9101`.

## Current Status
- Fastify HTTP service with `/v1/transcribe` endpoint and readiness probe.
- Deterministic transcription pipeline for prototype flows (text fallback, base64 audio decode).
- Unit tests covering text, audio, and validation paths.

## Planned Enhancements
- Streaming websocket/LiveKit fan-out for partial transcripts.
- Vendor adapters (Deepgram, Whisper, custom models) with latency metrics.
- Voice activity detection and session state machines.
