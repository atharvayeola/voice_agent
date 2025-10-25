import { config } from "./config.js";
const XML_ENTITIES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
};
function escapeXml(input) {
    return input.replace(/[&<>"']/g, (char) => XML_ENTITIES[char]);
}
export function buildVoiceResponse(message) {
    const sanitized = escapeXml(message);
    return (`<?xml version="1.0" encoding="UTF-8"?>` +
        `<Response>` +
        `<Say voice="${config.twilioVoice}" language="${config.twilioLanguage}">${sanitized}</Say>` +
        `</Response>`);
}
//# sourceMappingURL=twiml.js.map