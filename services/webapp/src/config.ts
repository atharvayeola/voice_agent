import "dotenv/config";

export const config = {
    port: Number(process.env.PORT ?? "3000"),
    host: process.env.HOST ?? "0.0.0.0",
    nodeEnv: process.env.NODE_ENV ?? "development",
    logLevel: process.env.LOG_LEVEL ?? "info",

    // Services
    agentRuntimeUrl: process.env.AGENT_RUNTIME_URL ?? "http://localhost:8090",

    // LiveKit
    livekitHost: process.env.LIVEKIT_HOST ?? "",
    livekitApiKey: process.env.LIVEKIT_API_KEY ?? "",
    livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? "",
};
