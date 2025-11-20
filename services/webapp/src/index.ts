import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "./config.js";
import callsRouter from "./routes/calls.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Health check
app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
});

// API routes
app.use("/api/calls", callsRouter);

// Serve webapp for all other routes
app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Start server
app.listen(config.port, config.host, () => {
    console.log(`🌐 Voice Agent Webapp listening at http://${config.host}:${config.port}`);
    console.log(`📡 Agent Runtime: ${config.agentRuntimeUrl}`);
    console.log(`🎙️  LiveKit: ${config.livekitHost}`);
});

// Graceful shutdown
const shutdown = () => {
    console.log("Shutting down webapp...");
    process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
