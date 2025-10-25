# Integration Tests

Will host automated call flow verifications using Node test harnesses (Playwright + Twilio Test Credentials). Includes mocked provider tests and full-stack staging checks.

Planned suites:
- **Twilio LiveKit bridge**: spin up mock PSTN traffic, verify SIP webhooks and LiveKit ingress tokens.
- **Agent knowledge answers**: ensure queries like "What’s the refund policy?" return vector-backed answers with citations.
- **Failure recovery**: simulate dropped agent worker and confirm gateway-driven session restart via LiveKit reconnection.
