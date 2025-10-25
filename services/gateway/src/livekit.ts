import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import type { FastifyBaseLogger } from "fastify";

import { config } from "./config.js";

const roomService = new RoomServiceClient(config.livekitHost, config.livekitApiKey, config.livekitApiSecret);

interface EnsureRoomOptions {
  roomName: string;
  metadata?: Record<string, unknown>;
  emptyTimeoutSeconds?: number;
}

export async function ensureRoomExists(options: EnsureRoomOptions, logger: FastifyBaseLogger): Promise<void> {
  const metadata = options.metadata ? JSON.stringify(options.metadata) : undefined;

  try {
    const rooms = await roomService.listRooms([options.roomName]);
    if (rooms.some((room) => room.name === options.roomName)) {
      return;
    }
  } catch (error) {
    logger.warn({ err: error, room: options.roomName }, "failed to list LiveKit rooms, attempting create anyway");
  }

  try {
    await roomService.createRoom({
      name: options.roomName,
      metadata,
      emptyTimeout: options.emptyTimeoutSeconds ?? config.livekitRoomEmptyTimeoutSeconds,
    });
    logger.info({ room: options.roomName }, "created LiveKit room");
  } catch (error) {
    if (!isAlreadyExists(error)) {
      logger.error({ err: error, room: options.roomName }, "failed to create LiveKit room");
      throw error;
    }
  }
}

function isAlreadyExists(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as { code?: number | string }).code;
  if (code === 6 || code === "ALREADY_EXISTS") {
    return true;
  }

  const message = (error as { message?: string }).message;
  if (typeof message === "string" && message.toLowerCase().includes("already exists")) {
    return true;
  }

  return false;
}

interface AgentTokenOptions {
  identity: string;
  roomName: string;
  ttlSeconds?: number;
  metadata?: Record<string, unknown>;
}

export async function createAgentAccessToken(options: AgentTokenOptions): Promise<string> {
  const token = new AccessToken(config.livekitApiKey, config.livekitApiSecret, {
    identity: options.identity,
    ttl: options.ttlSeconds ?? config.livekitTokenTtlSeconds,
    metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
  });

  token.addGrant({
    room: options.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    hidden: true,
  });
  return await token.toJwt();
}
