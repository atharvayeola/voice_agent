#!/usr/bin/env node

const gatewayUrl = process.env.GATEWAY_URL ?? "http://localhost:8080";
const utterance = process.env.SMOKE_UTTERANCE ?? "What is the refund policy?";

function buildTwilioPayload(callSid, text) {
  const params = new URLSearchParams();
  params.set("CallSid", callSid);
  params.set("SpeechResult", text);
  params.set("From", process.env.SMOKE_CALLER ?? "+15550000000");
  params.set("To", process.env.SMOKE_CALLEE ?? "+15559999999");
  return params;
}

function extractSipUri(xml) {
  const match = xml.match(/<Sip[^>]*>([\s\S]*?)<\/Sip>/i);
  return match?.[1]?.trim();
}

function isFallback(xml) {
  return /<Say[^>]*>/.test(xml) && !/<Sip[^>]*>/.test(xml);
}

async function main() {
  const callSid = `SMOKE-${Date.now()}`;
  const payload = buildTwilioPayload(callSid, utterance);

  const start = performance.now();
  const response = await fetch(`${gatewayUrl}/twilio/voice`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: payload,
  });
  const raw = await response.text();
  const latencyMs = Number((performance.now() - start).toFixed(2));

  if (!response.ok) {
    console.error(`Gateway responded with HTTP ${response.status}`);
    console.error(raw);
    process.exit(1);
  }

  if (isFallback(raw)) {
    console.error("Gateway returned fallback TwiML instead of SIP Dial.");
    console.error(raw);
    process.exit(2);
  }

  const sipUri = extractSipUri(raw);
  const success = typeof sipUri === "string" && sipUri.startsWith("sip:");

  console.log(
    JSON.stringify(
      {
        gatewayUrl,
        callSid,
        utterance,
        latencyMs,
        sipUri,
        matchedExpected: success,
      },
      null,
      2
    )
  );

  if (!success) {
    console.error("Expected SIP Dial TwiML with a sip: URI.");
    process.exit(2);
  }
}

main().catch((error) => {
  console.error("Smoke test failed", error);
  process.exit(1);
});
