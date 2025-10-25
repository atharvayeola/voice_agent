import pino from "pino";

import { config } from "./config.js";

export function buildLogger() {
  return pino({
    name: "agent-runtime",
    level: config.logLevel,
  });
}

export type Logger = ReturnType<typeof buildLogger>;
