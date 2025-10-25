import { afterEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    ensureRoomExistsMock: vi.fn(),
    createAgentAccessTokenMock: vi.fn(async () => "agent-token"),
    startAgentSessionMock: vi.fn(),
  };
});

vi.mock("../src/livekit.js", () => ({
  ensureRoomExists: mocks.ensureRoomExistsMock,
  createAgentAccessToken: mocks.createAgentAccessTokenMock,
}));

vi.mock("../src/agent-runtime-client.js", () => ({
  startAgentSession: mocks.startAgentSessionMock,
}));

import { buildServer } from "../src/server.js";
import { config } from "../src/config.js";

function extractTag(xml: string, tag: string) {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(pattern);
  return match?.[1]?.trim();
}

function extractSipAttributes(xml: string) {
  const match = xml.match(/<Sip([^>]*)>/i);
  if (!match) {
    return {} as Record<string, string>;
  }

  const attrs: Record<string, string> = {};
  const attrPattern = /([a-zA-Z-]+)="([^"]*)"/g;
  let current: RegExpExecArray | null;
  while ((current = attrPattern.exec(match[1] ?? "")) !== null) {
    attrs[current[1]] = current[2];
  }
  return attrs;
}

const { ensureRoomExistsMock, createAgentAccessTokenMock, startAgentSessionMock } = mocks;

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /twilio/voice", () => {
  test("creates LiveKit session and returns SIP TwiML", async () => {
    const app = buildServer();

    ensureRoomExistsMock.mockResolvedValueOnce(undefined);
  createAgentAccessTokenMock.mockResolvedValueOnce("agent-token");
    startAgentSessionMock.mockResolvedValueOnce(undefined);

    try {
      const response = await app.inject({
        method: "POST",
        url: "/twilio/voice",
        payload: {
          CallSid: "CA111",
          From: "+15551234567",
          To: "+15557654321",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("application/xml");

      const body = response.body;
      expect(body).toContain("<Dial");
      expect(body).toContain("<Sip");
      expect(extractTag(body, "Say")).toBeUndefined();

      expect(ensureRoomExistsMock).toHaveBeenCalledWith(
        {
          roomName: `${config.livekitRoomPrefix}CA111`,
          metadata: {
            callSid: "CA111",
            from: "+15551234567",
            to: "+15557654321",
          },
        },
        expect.any(Object)
      );

      expect(createAgentAccessTokenMock).toHaveBeenCalledWith({
        identity: `${config.livekitAgentIdentityPrefix}CA111`,
        roomName: `${config.livekitRoomPrefix}CA111`,
        metadata: {
          callSid: "CA111",
          role: "agent",
        },
      });

      expect(startAgentSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          callSid: "CA111",
          roomName: `${config.livekitRoomPrefix}CA111`,
          participantIdentity: `${config.livekitSipIdentityPrefix}CA111`,
          livekitToken: "agent-token",
        }),
        expect.any(Object)
      );

      const sipAttrs = extractSipAttributes(body);
      expect(sipAttrs.headers).toContain("X-CallSid=CA111");
      expect(sipAttrs.headers).toContain(`X-LiveKit-Room=${config.livekitRoomPrefix}CA111`);
      expect(sipAttrs.headers).toContain(`X-LiveKit-Participant=${config.livekitSipIdentityPrefix}CA111`);
    } finally {
      await app.close();
    }
  });

  test("returns spoken fallback when LiveKit bootstrap fails", async () => {
    const app = buildServer();

    ensureRoomExistsMock.mockRejectedValueOnce(new Error("LiveKit unavailable"));

    try {
      const response = await app.inject({
        method: "POST",
        url: "/twilio/voice",
        payload: {
          CallSid: "CA500",
          From: "+15550000000",
          To: "+15559999999",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain("<Say");
      expect(extractTag(response.body, "Dial")).toBeUndefined();

      expect(startAgentSessionMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
