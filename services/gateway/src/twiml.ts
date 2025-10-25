import { config } from "./config.js";

const XML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeXml(input: string) {
  return input.replace(/[&<>"']/g, (char) => XML_ENTITIES[char]);
}

function escapeAttribute(input: string) {
  return escapeXml(input).replace(/\r|\n/g, "");
}

export function buildSayResponse(message: string) {
  const sanitized = escapeXml(message);

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response>` +
    `<Say voice="${config.twilioVoice}" language="${config.twilioLanguage}">${sanitized}</Say>` +
    `</Response>`
  );
}

interface SipDialOptions {
  sipUri: string;
  username?: string;
  password?: string;
  callerId?: string;
  answerOnBridge?: boolean;
  sipHeaders?: Record<string, string>;
}

export function buildSipDialResponse(options: SipDialOptions) {
  const dialAttributes: string[] = [];
  if (options.callerId) {
    dialAttributes.push(`callerId="${escapeAttribute(options.callerId)}"`);
  }
  if (options.answerOnBridge ?? true) {
    dialAttributes.push(`answerOnBridge="true"`);
  }

  const sipAttributes: string[] = [];
  if (options.username) {
    sipAttributes.push(`username="${escapeAttribute(options.username)}"`);
  }
  if (options.password) {
    sipAttributes.push(`password="${escapeAttribute(options.password)}"`);
  }

  if (options.sipHeaders && Object.keys(options.sipHeaders).length > 0) {
    const headers = Object.entries(options.sipHeaders)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join("&");
    sipAttributes.push(`headers="${escapeAttribute(headers)}"`);
  }

  const sipUri = escapeXml(options.sipUri);

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response>` +
    `<Dial${dialAttributes.length > 0 ? " " + dialAttributes.join(" ") : ""}>` +
    `<Sip${sipAttributes.length > 0 ? " " + sipAttributes.join(" ") : ""}>${sipUri}</Sip>` +
    `</Dial>` +
    `</Response>`
  );
}
