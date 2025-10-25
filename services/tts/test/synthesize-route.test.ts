import { describe, expect, test } from "vitest";

import { buildServer } from "../src/server.js";

describe("POST /v1/synthesize", () => {
  test("returns base64 audio for text input", async () => {
    const app = buildServer();

    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/synthesize",
        payload: {
          sessionId: "call-789",
          text: "Your order has shipped and will arrive tomorrow.",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.audioFormat).toBe("linear16");
      const decoded = Buffer.from(body.audio, "base64").toString("utf8");
      expect(decoded).toContain("Your order has shipped");
      expect(body.durationMs).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });

  test("rejects missing text", async () => {
    const app = buildServer();

    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/synthesize",
        payload: {
          sessionId: "call-999",
        },
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});
