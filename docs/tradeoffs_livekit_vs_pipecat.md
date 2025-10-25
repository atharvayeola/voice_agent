# LiveKit vs Pipecat Trade-Offs

| Dimension | LiveKit | Pipecat |
| --- | --- | --- |
| **Deployment Model** | Mature SFU with managed cloud or self-hosted options; SIP ingress, agents SDK, observability built-in. | Lightweight WebRTC media router aimed at custom pipelines; requires more bespoke wiring for SIP and barge-in. |
| **SIP/PSTN Support** | Native SIP ingress/egress (beta) with Twilio interop; PSTN bridging documented. | No first-party SIP ingress; must bridge via external SBC/gateway. |
| **Agent SDK Integration** | Agent framework for server-side participants, track subscriptions, and AudioStream APIs (Node/TS, Go, Python). | Focused on audio processing pipelines; lacks high-level agent orchestration features. |
| **Latency Profile** | Proven <200 ms SFU hop; global POPs; supports adaptive jitter buffers and low-latency audio. | Lightweight but requires tuning; less battle-tested at 100 PSTN calls. |
| **Scalability** | Horizontal scale nodes; auto-scaling groups; multi-region options; integrated metrics exporter. | Requires custom scaling; documentation sparse for high concurrency. |
| **Barge-In & Duplex Audio** | Built-in server-side track pausing/resuming; agent SDK exposes APIs for barge-in control. | Must implement custom audio mixing and cancellation. |
| **Ecosystem & Tooling** | Rich admin UI, REST/WS APIs, OSS community, k8s Helm charts. | Smaller community, less infrastructure tooling. |
| **Cost & Resource Use** | Higher baseline cost (managed); self-hosted requires more compute but predictable. | Lightweight (Rust); potentially cheaper if built around custom infra. |

## Recommendation
LiveKit stands out for PSTN interoperability, ready-made agent SDK, and instrumentation support—critical for meeting the <600 ms latency requirement at 100 concurrent calls. Pipecat may suit highly customized media processing or experimental pipelines, but would require significantly more engineering effort to achieve the same resilience, SIP bridging, and observability guarantees. Use LiveKit for production; evaluate Pipecat as a niche alternative for specialized audio transformations where full SFU control is needed.
