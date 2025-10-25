import { z } from "zod";
export const conversationTurnSchema = z.object({
    role: z.enum(["user", "agent", "system"]),
    content: z.string().min(1),
    timestamp: z.string().datetime().optional(),
});
export const agentRequestSchema = z.object({
    sessionId: z.string().min(1),
    utterance: z.string().min(1),
    conversation: z.array(conversationTurnSchema).default([]),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
//# sourceMappingURL=schemas.js.map