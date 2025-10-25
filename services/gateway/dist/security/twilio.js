import twilio from "twilio";
import { config } from "../config.js";
const { validateRequest } = twilio;
function buildRequestUrl(request) {
    if (config.publicUrl) {
        return new URL(request.raw.url ?? "/", config.publicUrl).toString();
    }
    const forwardedHost = request.headers["x-forwarded-host"] ?? request.headers.host;
    if (typeof forwardedHost !== "string" || forwardedHost.length === 0) {
        return undefined;
    }
    const forwardedProto = request.headers["x-forwarded-proto"];
    const protocol = typeof forwardedProto === "string" ? forwardedProto : "https";
    return `${protocol}://${forwardedHost}${request.raw.url ?? "/"}`;
}
function normaliseRequestBody(body) {
    if (!body || typeof body !== "object") {
        return {};
    }
    const entries = Object.entries(body).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(",") : value === undefined ? "" : String(value),
    ]);
    return Object.fromEntries(entries);
}
export async function twilioWebhookGuard(request, reply) {
    if (!config.twilioAuthToken) {
        request.log.warn("TWILIO_AUTH_TOKEN not set; skipping webhook signature validation");
        return;
    }
    const signature = request.headers["x-twilio-signature"];
    if (typeof signature !== "string") {
        request.log.warn("Missing X-Twilio-Signature header");
        reply.code(401).send({ error: "missing_signature" });
        return;
    }
    const requestUrl = buildRequestUrl(request);
    if (!requestUrl) {
        request.log.warn("Unable to determine request URL for Twilio validation; skipping check");
        return;
    }
    const params = normaliseRequestBody(request.body);
    const valid = validateRequest(config.twilioAuthToken, signature, requestUrl, params);
    if (!valid) {
        request.log.warn({ requestUrl }, "Twilio signature validation failed");
        reply.code(401).send({ error: "invalid_signature" });
    }
}
//# sourceMappingURL=twilio.js.map