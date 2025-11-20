import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { AccessToken } from "livekit-server-sdk";
import { randomBytes } from "node:crypto";

import { config } from "../config.js";

const router = Router();

// Schema for starting a call
const startCallSchema = z.object({
    userName: z.string().min(1).optional(),
});

// POST /api/calls/start - Initialize a new voice call
router.post("/start", async (req: Request, res: Response) => {
    try {
        const body = startCallSchema.parse(req.body ?? {});

        // Generate unique identifiers
        const sessionId = `webapp-${Date.now()}-${randomBytes(4).toString("hex")}`;
        const roomName = `call-${sessionId}`;
        const userName = body.userName ?? `User-${randomBytes(3).toString("hex")}`;

        // Create LiveKit access token for the user
        const token = new AccessToken(
            config.livekitApiKey,
            config.livekitApiSecret,
            {
                identity: userName,
                ttl: 3600, // 1 hour
            }
        );

        token.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        const livekitToken = await token.toJwt();

        // Initialize session with agent runtime
        const agentRuntimeResponse = await fetch(`${config.agentRuntimeUrl}/api/sessions`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                callSid: sessionId,
                roomName,
                participantIdentity: userName,
                livekitToken,
                initialContext: {
                    source: "webapp",
                    userName,
                },
            }),
        });

        if (!agentRuntimeResponse.ok) {
            const errorText = await agentRuntimeResponse.text();
            throw new Error(`Agent runtime failed: ${agentRuntimeResponse.status} ${errorText}`);
        }

        const agentData = await agentRuntimeResponse.json();

        res.json({
            sessionId: agentData.sessionId,
            roomName,
            livekitToken,
            livekitUrl: "http://localhost:7880",  // LiveKit client SDK will upgrade to WebSocket
            userName,
        });
    } catch (error) {
        console.error("Failed to start call:", error);
        res.status(500).json({
            error: "failed_to_start_call",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// POST /api/calls/outbound - Make an outbound call via Twilio
router.post("/outbound", async (req: Request, res: Response) => {
    try {
        const { phoneNumber, greeting } = req.body;

        if (!phoneNumber) {
            res.status(400).json({ error: "phone_number_required" });
            return;
        }

        // Validate phone number format
        if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
            res.status(400).json({
                error: "invalid_phone_number",
                message: "Phone number must be in E.164 format (e.g., +1234567890)"
            });
            return;
        }

        // Note: This requires Twilio SDK and configuration
        // For trial accounts, the number must be verified in Twilio console
        const sessionId = `outbound-${Date.now()}-${randomBytes(4).toString("hex")}`;

        // TODO: Implement actual Twilio call initiation
        // const twilioClient = require('twilio')(config.twilioAccountSid, config.twilioAuthToken);
        // const call = await twilioClient.calls.create({
        //     to: phoneNumber,
        //     from: config.twilioPhoneNumber,
        //     url: `${config.publicUrl}/twilio/voice?sessionId=${sessionId}`
        // });

        res.json({
            sessionId,
            phoneNumber,
            status: "demo_mode",
            message: "Outbound calling requires Twilio phone number and gateway service. Web interface demo works without it!"
        });

    } catch (error) {
        console.error("Failed to initiate outbound call:", error);
        res.status(500).json({
            error: "failed_to_call",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// GET /api/calls/:sessionId - Get real-time metrics for a call
router.get("/:sessionId", async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        // Fetch session metrics from agent runtime
        const response = await fetch(`${config.agentRuntimeUrl}/api/sessions/${sessionId}`);

        if (!response.ok) {
            if (response.status === 404) {
                res.status(404).json({ error: "session_not_found" });
                return;
            }
            throw new Error(`Agent runtime error: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Failed to fetch call metrics:", error);
        res.status(500).json({
            error: "failed_to_fetch_metrics",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

// DELETE /api/calls/:sessionId - End a call
router.delete("/:sessionId", async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        // Delete session from agent runtime
        const response = await fetch(`${config.agentRuntimeUrl}/api/sessions/${sessionId}`, {
            method: "DELETE",
        });

        if (!response.ok && response.status !== 404) {
            throw new Error(`Agent runtime error: ${response.status}`);
        }

        res.status(204).send();
    } catch (error) {
        console.error("Failed to end call:", error);
        res.status(500).json({
            error: "failed_to_end_call",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});

export default router;
