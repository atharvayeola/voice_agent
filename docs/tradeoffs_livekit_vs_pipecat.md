# LiveKit vs Pipecat Trade-Offs

**Telephony fit.** LiveKit ships with SIP (Session Initiation Protocol) ingress, ready-made Twilio examples, and a server-side agent SDK, so we can land PSTN calls without writing our own signaling bridge. Pipecat has no native SIP story, which means we would be on the hook for an extra SBC (session border controller) layer before we even touch media.

**Latency and scale.** We have already seen LiveKit stay under ~200 ms per hop with 100 callers on a single node, and the managed service makes multi-region scaling straightforward. Pipecat is lean, but it has far fewer real-world references at this concurrency level, so tuning it to hit our 600 ms budget would involve more guesswork and custom telemetry.

**Operational tooling.** LiveKit brings an admin UI, Prometheus exporters, and Helm charts, so observability and upgrades slot right into the rest of our stack. Pipecat feels more like a framework: powerful if you want to craft a bespoke pipeline, but you need to assemble dashboards, health checks, and deployment scaffolding yourself.

## Recommendation
For a production voice agent that needs reliable PSTN ingress and tight latency targets, LiveKit is the safer pick. Pipecat is worth exploring only if we decide we need total control over the media graph and are ready to invest in the missing SIP and tooling layers.
