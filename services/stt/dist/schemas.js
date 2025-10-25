import { z } from "zod";
export const transcribeRequestSchema = z
    .object({
    sessionId: z.string().min(1).default(() => `sess-${Date.now()}`),
    language: z.string().optional(),
    text: z.string().min(1).optional(),
    audio: z
        .string()
        .regex(/^[A-Za-z0-9+/=]+$/, "audio must be base64-encoded")
        .optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
})
    .refine((value) => Boolean(value.text) || Boolean(value.audio), {
    message: "either text or audio is required",
    path: ["text"],
});
//# sourceMappingURL=schemas.js.map