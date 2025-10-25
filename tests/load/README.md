# Load Testing Harness

Plan to use SIPp for PSTN load generation and LiveKit synthetic clients for SFU stress tests. `sipp_scenario.xml` represents a 30-second call including setup/teardown and should be orchestrated by `sipp` in distributed mode to simulate 10/50/100 concurrent calls. Future iterations will include a Node-based controller that feeds prerecorded audio clips into LiveKit for MOS estimation.
