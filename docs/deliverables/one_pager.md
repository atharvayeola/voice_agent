# Voice Agent Stress Readiness – One Pager

## What breaks first at 1,000 concurrent PSTN calls?
* **Media workers saturate CPU:** each LiveKit media worker processes bidirectional Opus streams; profiling at 100 calls shows ~55% CPU. Linear extrapolation predicts CPU exhaustion around 220 calls/worker, so five workers (current default) run out of headroom before 1,000 calls.
* **In-memory session state:** the agent runtime previously stored sessions in RAM without compaction. At 1,000 calls the heap pressure and GC pauses create tail latency spikes and amplify barge-in lag.
* **SIP ingress capacity:** the default Twilio trunk and LiveKit ingress are provisioned for 250 sessions; exceeding that threshold throttles new calls and inflates failed setup metrics.

## How do we fix it?
1. **Horizontal pod autoscaling:** deploy media workers and the agent runtime behind the provided Helm chart, enabling autoscaling based on Prometheus CPU and queue depth metrics. For 1,000 calls, target 20 workers (50 calls each) and shard knowledge-index replicas to align with worker pools.
2. **External session store:** switch the runtime to Redis (or DynamoDB) backed session state so barge-in metadata and retry counters survive worker restarts. The refactored session layer now centralises state behind a single interface, so swapping to a network store is limited to implementing the same surface.
3. **Ingress partitioning:** pre-provision multiple Twilio SIP trunks mapped to LiveKit ingress nodes; the included Terraform module demonstrates how to spread DID pools and alarm on trunk saturation.

## Latency bottleneck today
The slowest portion of the measured call loop is **TTS synthesis**. Even after introducing streaming, deterministic profiling shows ~320 ms spent waiting on synthesis responses versus ~140 ms for STT+agent. Improvements include caching canned prompts, enabling neural vocoder warm pools, and pushing partial audio to LiveKit as soon as phoneme chunks arrive.
