#!/usr/bin/env node
import { performance } from "node:perf_hooks";

const BASE_URL = process.env.AGENT_RUNTIME_URL ?? "http://localhost:8090";
const PIPELINE_LATENCY_TARGET = Number(process.env.PIPELINE_LATENCY_TARGET ?? "600");
const CONCURRENCY_TARGET = Number(process.env.CONCURRENCY_TARGET ?? "100");

async function main() {
  console.log("🔍 Validating voice-agent objectives against", BASE_URL);

  try {
    const concurrentResults = await runConcurrentSessions();
    const latencyResult = await runLatencyProbe(concurrentResults.samples);
    const bargeInResult = await runBargeInProbe();

    const passed = concurrentResults.ok && latencyResult.ok && bargeInResult.ok;

    console.log("\n📋 Summary");
    console.table([
      {
        objective: "Concurrent calls",
        status: concurrentResults.ok ? "PASS" : "FAIL",
        detail: concurrentResults.detail,
      },
      {
        objective: `Pipeline latency < ${PIPELINE_LATENCY_TARGET}ms`,
        status: latencyResult.ok ? "PASS" : "FAIL",
        detail: latencyResult.detail,
      },
      {
        objective: "Barge-in handled",
        status: bargeInResult.ok ? "PASS" : "FAIL",
        detail: bargeInResult.detail,
      },
    ]);

    if (!passed) {
      console.error("\n❌ Objective validation failed");
      process.exit(1);
    }

    console.log("\n✅ All objectives validated successfully");
  } catch (error) {
    console.error("\n❌ Validation crashed", error);
    process.exit(1);
  }
}

async function runConcurrentSessions() {
  const sessionPromises = Array.from({ length: CONCURRENCY_TARGET }, (_, index) =>
    createSession(`CALL_CONCURRENT_${index.toString().padStart(3, "0")}`)
  );
  const sessions = await Promise.all(sessionPromises);

  const start = performance.now();
  const turns = await Promise.all(
    sessions.map((session, index) =>
      sendUtterance(session.sessionId, `Concurrent request ${index + 1}`, session.callSid)
    )
  );
  const elapsed = Number((performance.now() - start).toFixed(2));

  const successfulTurns = turns.filter((turn) => turn.success);
  const ok = successfulTurns.length === CONCURRENCY_TARGET;
  const detail = `${successfulTurns.length}/${CONCURRENCY_TARGET} turns completed in ${elapsed}ms`;

  return {
    ok,
    detail,
    samples: successfulTurns,
  };
}

async function runLatencyProbe(samples) {
  if (samples.length === 0) {
    return {
      ok: false,
      detail: "no successful samples recorded",
    };
  }

  const pipelineLatencies = samples.map((sample) => sample.pipelineLatencyMs);
  const average = pipelineLatencies.reduce((sum, value) => sum + value, 0) / pipelineLatencies.length;
  const p95 = percentile(pipelineLatencies, 0.95);

  const ok = average <= PIPELINE_LATENCY_TARGET && p95 <= PIPELINE_LATENCY_TARGET;

  const detail = `avg ${average.toFixed(2)}ms, p95 ${p95.toFixed(2)}ms across ${samples.length} samples`;
  return {
    ok,
    detail,
  };
}

async function runBargeInProbe() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const callSid = `CALL_BARGE_${attempt}`;
    const session = await createSession(callSid);

    const firstTurnPromise = sendUtterance(session.sessionId, "Initial prompt", callSid, {
      conversation: [],
    });

    await sleep(75 + attempt * 50);

    const interruptTurn = await sendUtterance(session.sessionId, "Interrupting follow-up", callSid, {
      conversation: [
        {
          role: "user",
          content: "Initial prompt",
          timestamp: new Date().toISOString(),
        },
        {
          role: "agent",
          content: "Stub agent reply",
          timestamp: new Date().toISOString(),
        },
      ],
    });

    await firstTurnPromise;

    if (!interruptTurn.success) {
      continue;
    }

    if (interruptTurn.bargeInHandled) {
      return {
        ok: true,
        detail: `barge-in acknowledged on attempt ${attempt + 1}, pipeline latency ${interruptTurn.pipelineLatencyMs}ms`,
      };
    }
  }

  return {
    ok: false,
    detail: "Interrupt turn did not set bargeInHandled after 3 attempts",
  };
}

async function createSession(callSid) {
  const payload = {
    callSid,
    roomName: `call-${callSid}`,
    participantIdentity: `pstn-${callSid}`,
    livekitToken: `token-${callSid}`,
    initialContext: {
      from: "+15555550000",
      to: "+15555550001",
    },
  };

  const response = await fetch(`${BASE_URL}/api/sessions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create session ${callSid}: HTTP ${response.status} ${text}`);
  }

  const body = await response.json();
  return {
    sessionId: body.sessionId,
    callSid,
  };
}

async function sendUtterance(sessionId, utterance, callSid, options = {}) {
  const payload = {
    utterance,
    conversation: options.conversation ?? [
      {
        role: "user",
        content: utterance,
        timestamp: new Date().toISOString(),
      },
    ],
    metadata: {
      source: "objective-validator",
    },
  };

  const started = performance.now();
  const response = await fetch(`${BASE_URL}/api/sessions/${sessionId}/utterances`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const elapsed = Number((performance.now() - started).toFixed(2));

  if (!response.ok) {
    const text = await response.text();
    return {
      success: false,
      callSid,
      pipelineLatencyMs: elapsed,
      detail: `HTTP ${response.status} ${text}`,
    };
  }

  const body = await response.json();
  return {
    success: true,
    callSid,
    pipelineLatencyMs: body.pipelineLatencyMs,
    agentLatencyMs: body.agentLatencyMs,
    bargeInHandled: body.bargeInHandled === true,
    quality: body.quality,
    detail: body,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[index];
}

await main();
