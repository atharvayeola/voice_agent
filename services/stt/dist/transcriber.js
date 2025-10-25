import { config } from "./config.js";
function normalizeText(text) {
    return text.replace(/\s+/g, " ").trim();
}
function decodeAudio(base64) {
    if (!base64) {
        return undefined;
    }
    try {
        return Buffer.from(base64, "base64").toString("utf8");
    }
    catch {
        return undefined;
    }
}
function splitIntoSegments(transcript) {
    const sentences = transcript.match(/[^.!?]+[.!?]?/g) ?? [transcript];
    const segments = [];
    let current = "";
    let startMs = 0;
    for (const sentence of sentences) {
        const candidate = current.length === 0 ? sentence.trim() : `${current} ${sentence}`.trim();
        if (candidate.length > config.chunkCharacters && current.length > 0) {
            segments.push({
                startMs,
                endMs: startMs + config.segmentLengthMs,
                text: current,
            });
            startMs += config.segmentLengthMs;
            current = sentence.trim();
        }
        else {
            current = candidate;
        }
    }
    if (current.length > 0) {
        segments.push({
            startMs,
            endMs: startMs + config.segmentLengthMs,
            text: current,
        });
    }
    return segments;
}
export function generateTranscription(payload) {
    const textFromAudio = decodeAudio(payload.audio);
    const transcript = normalizeText(payload.text ?? textFromAudio ?? "");
    if (!transcript) {
        throw new Error("Unable to derive transcript from request payload");
    }
    const segments = splitIntoSegments(transcript);
    return {
        sessionId: payload.sessionId,
        transcript,
        confidence: config.baseConfidence,
        language: payload.language ?? config.defaultLanguage,
        segments,
        metadata: {
            ...payload.metadata,
            source: payload.text ? "text" : "audio",
        },
    };
}
//# sourceMappingURL=transcriber.js.map