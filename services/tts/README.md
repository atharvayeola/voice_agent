# TTS Service

Low-latency text-to-speech streaming pipeline.

## Running Locally

```bash
pnpm --filter @voice-agent/tts dev
```

`POST /v1/synthesize` accepts text and returns deterministic base64 audio along with duration and sample-rate metadata. Defaults to port `9103`.

## Current Status
- Fastify HTTP service with `/v1/synthesize` endpoint and readiness probe.
- Deterministic synthesis pipeline for prototype demos (encodes text into base64 payloads).
- Unit tests verifying happy-path generation and validation errors.

## Planned Enhancements
- Streaming chunked audio for barge-in support.
- Vendor adapters (ElevenLabs, Azure Neural, etc.) with MOS scoring.
- Detailed latency metrics and audio format negotiation.
