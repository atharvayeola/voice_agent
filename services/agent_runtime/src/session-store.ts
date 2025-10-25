export interface CreateSessionInput {
  callSid: string;
  roomName: string;
  participantIdentity: string;
  livekitToken: string;
  initialContext?: Record<string, unknown> | undefined;
}

export interface SessionState {
  id: string;
  callSid: string;
  roomName: string;
  participantIdentity: string;
  livekitToken: string;
  initialContext?: Record<string, unknown> | undefined;
  createdAt: number;
  lastUtteranceAt?: number;
  ttsInFlight: boolean;
  bargeInCount: number;
}

export class SessionStore {
  private readonly sessions = new Map<string, SessionState>();

  create(input: CreateSessionInput): SessionState {
    const id = input.callSid;
    const now = Date.now();

    const state: SessionState = {
      id,
      callSid: input.callSid,
      roomName: input.roomName,
      participantIdentity: input.participantIdentity,
    livekitToken: input.livekitToken,
    initialContext: input.initialContext,
      createdAt: now,
      lastUtteranceAt: undefined,
      ttsInFlight: false,
      bargeInCount: 0,
    };

    this.sessions.set(id, state);
    return state;
  }

  get(id: string): SessionState | undefined {
    return this.sessions.get(id);
  }

  delete(id: string): void {
    this.sessions.delete(id);
  }

  /**
   * Marks the beginning of a new user utterance. Returns true if an agent response
   * was still playing, signalling that barge-in handling is required.
   */
  markUtteranceStart(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) {
      return false;
    }

    const wasSpeaking = session.ttsInFlight;
    session.ttsInFlight = true;
    session.lastUtteranceAt = Date.now();

    if (wasSpeaking) {
      session.bargeInCount += 1;
    }

    return wasSpeaking;
  }

  markTtsComplete(id: string): void {
    const session = this.sessions.get(id);
    if (!session) {
      return;
    }

    session.ttsInFlight = false;
  }

  snapshot(): SessionState[] {
    return Array.from(this.sessions.values());
  }
}
