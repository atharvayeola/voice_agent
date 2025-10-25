# Voice Agent Stress Readiness

## What breaks first at 1,000 concurrent phone calls?
* **Media servers hit their limit:** each LiveKit worker mixes audio for callers. At 100 calls a worker uses about 55% CPU. If we keep adding calls the worker runs out of CPU near 220 calls, so the five workers we run today would stall long before 1,000 calls.
* **Runtime keeps sessions in memory:** the Agent Runtime used to keep active call state only in RAM. With 1,000 calls that memory fills up, garbage collection kicks in, and caller audio starts to lag when someone barges in.
* **Phone ingress is capped:** the standard Twilio SIP (Session Initiation Protocol) trunk plus LiveKit ingress are sized for roughly 250 calls. Once we pass that, new calls get throttled and failed setup alarms fire.

## How do we fix it?
1. **Scale more workers automatically:** deploy the media workers and Agent Runtime with horizontal pod autoscaling so Kubernetes adds pods when CPU or queue depth climbs. For 1,000 calls we plan for about 20 workers (50 calls each) and scale the knowledge index to match.
2. **Move session state to Redis:** store barge-in counters and retry data in Redis (or another managed store) so it survives pod restarts. The session layer already hides the storage details, so the swap is a small code change.
3. **Split phone ingress across trunks:** create multiple Twilio trunks and point them at different LiveKit ingress nodes. The provided Terraform example shows how to spread the phone numbers and alert when a trunk starts to fill up.

## Biggest latency spike right now
The slowest part of the call loop is **text-to-speech (TTS)**. Even with streaming turned on we spend roughly 320 milliseconds waiting for speech audio, while speech-to-text plus the agent logic together take about 140 milliseconds. To close that gap we cache common phrases, keep the neural voice models warm, and send partial audio to LiveKit as soon as it lands.
