import { z } from "zod";
export const synthesizeRequestSchema = z.object({
    sessionId: z.string().min(1).default(() => `sess-${Date.now()}`),
    text: z.string().min(1),
    voice: z.string().optional(),
    language: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
//# sourceMappingURL=schemas.js.map