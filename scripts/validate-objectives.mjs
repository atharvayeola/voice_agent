#!/usr/bin/env node
import { performance } from "node:perf_hooks";

const BASE_URL = process.env.AGENT_RUNTIME_URL ?? "http://localhost:8090";
const PIPELINE_LATENCY_TARGET = Number(process.env.PIPELINE_LATENCY_TARGET ?? "600");

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
  const sessionA = await createSession("CALL_CONCURRENT_A");
  const sessionB = await createSession("CALL_CONCURRENT_B");

  const start = performance.now();
  const [turnA, turnB] = await Promise.all([
    sendUtterance(sessionA.sessionId, "Concurrent request A", sessionA.callSid),
    sendUtterance(sessionB.sessionId, "Concurrent request B", sessionB.callSid),
  ]);
  const elapsed = Number((performance.now() - start).toFixed(2));

  const detail = `Responses completed in ${elapsed}ms (A ${turnA.pipelineLatencyMs}ms, B ${turnB.pipelineLatencyMs}ms)`;

  return {
    ok: turnA.success && turnB.success,
    detail,
    samples: [turnA, turnB],
  };
}

async function runLatencyProbe(samples) {
  const overBudget = samples.filter((sample) => sample.pipelineLatencyMs > PIPELINE_LATENCY_TARGET);

  if (overBudget.length > 0) {
    const detail = overBudget
      .map((sample) => `${sample.callSid}: ${sample.pipelineLatencyMs}ms`)
      .join(", ");
    return {
      ok: false,
      detail,
    };
  }

  const detail = samples
    .map((sample) => `${sample.callSid}: ${sample.pipelineLatencyMs}ms (agent ${sample.agentLatencyMs}ms)`)
    .join(", ");
  return {
    ok: true,
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
    detail: body,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

await main();
