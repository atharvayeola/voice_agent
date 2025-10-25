import { describe, expect, test } from "vitest";

import { buildServer } from "../src/server.js";

describe("POST /v1/transcribe", () => {
  test("returns segments when text payload provided", async () => {
    const app = buildServer();

    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/transcribe",
        payload: {
          sessionId: "call-123",
          text: "Hello there. How can I help you today?",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.transcript).toBe("Hello there. How can I help you today?");
      expect(body.segments.length).toBeGreaterThan(0);
      expect(body.segments[0].text).toContain("Hello");
    } finally {
      await app.close();
    }
  });

  test("decodes base64 audio input", async () => {
    const app = buildServer();

    try {
      const audio = Buffer.from("This is a recorded prompt", "utf8").toString("base64");
      const response = await app.inject({
        method: "POST",
        url: "/v1/transcribe",
        payload: {
          sessionId: "call-456",
          audio,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.transcript).toBe("This is a recorded prompt");
      expect(body.metadata.source).toBe("audio");
    } finally {
      await app.close();
    }
  });

  test("rejects empty payload", async () => {
    const app = buildServer();

    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/transcribe",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});
