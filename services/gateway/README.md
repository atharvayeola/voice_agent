# Gateway Service

Entry point for PSTN traffic entering the voice agent platform. Responsibilities include:
- Terminating Twilio webhook callbacks with signature validation.
- Orchestrating LiveKit rooms and issuing tokens for media sessions.
- Forwarding PSTN callers to LiveKit SIP ingress and spinning up the agent runtime.
- Emitting structured telemetry for observability and autoscaling decisions.
- Serving health/readiness endpoints for Kubernetes probes.

## Local Development
1. Copy `.env.example` to `.env` and fill in:
	- `TWILIO_AUTH_TOKEN`: webhook secret used for signature validation.
	- `PUBLIC_URL`: externally reachable base URL (e.g. `https://abc.ngrok.io`).
	- `AGENT_RUNTIME_URL`: base URL for the LiveKit-aware agent runtime (defaults to `http://localhost:8090`).
	- `LIVEKIT_HOST`: API host for LiveKit (e.g. `http://localhost:7880` in docker-compose).
	- `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET`: credentials for issuing access tokens.
	- `LIVEKIT_SIP_URI`: SIP URI for the LiveKit ingress Twilio should dial.
	- Optional overrides: `HOST`, `PORT`, `LOG_LEVEL`, `LIVEKIT_SIP_USERNAME`, `LIVEKIT_SIP_PASSWORD`, `LIVEKIT_ROOM_PREFIX`, `LIVEKIT_AGENT_IDENTITY_PREFIX`.
2. Install dependencies from the repo root: `pnpm install`.
3. Run the service in watch mode: `pnpm --filter @voice-agent/gateway dev`.
4. Expose the service externally (e.g. `ngrok http 8080`) and point Twilio voice webhooks to `/twilio/voice`.

### Endpoints
- `POST /twilio/voice` — receives Twilio Voice webhooks, initializes LiveKit room + agent runtime, and returns SIP Dial TwiML pointing at the ingress.
- `GET /healthz` — process health metrics (provided by `@fastify/under-pressure`).
- `GET /readyz` — simple readiness probe hook.

## Next Steps
1. Handle LiveKit webhooks for participant lifecycle and error recovery.
2. Stream agent responses to Twilio with barge-in support.
3. Surface metrics/traces for LiveKit setup, agent runtime, and PSTN legs.
4. Persist call session metadata to Redis/Postgres for agent handoff.
5. Add integration tests covering signature validation and LiveKit orchestration error paths.
