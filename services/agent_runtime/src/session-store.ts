export interface CreateSessionInput {
  callSid: string;
  roomName: string;
  participantIdentity: string;
  livekitToken: string;
  initialContext?: Record<string, unknown> | undefined;
}

export interface SessionQualitySample {
  jitterMs: number;
  packetLossRatio: number;
  mos: number;
  recordedAt: number;
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
  latencyTimeline: Array<{ value: number; recordedAt: number }>;
  lastQualitySample?: SessionQualitySample;
  consecutiveFailures: number;
  totalTurns: number;
  failedTurns: number;
}

export interface SessionStoreOptions {
  maxSessions: number;
  sessionTtlMs: number;
  jitterWindowMs: number;
}

export class SessionCapacityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionCapacityError";
  }
}

export class SessionStore {
  private readonly sessions = new Map<string, SessionState>();

  constructor(private readonly options: SessionStoreOptions) {}

  create(input: CreateSessionInput): SessionState {
    if (this.sessions.size >= this.options.maxSessions) {
      throw new SessionCapacityError(
        `session capacity ${this.options.maxSessions} reached`
      );
    }

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
      latencyTimeline: [],
      consecutiveFailures: 0,
      totalTurns: 0,
      failedTurns: 0,
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

  get activeCount(): number {
    return this.sessions.size;
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

  recordLatency(
    id: string,
    latencyMs: number
  ): (SessionQualitySample & { averageLatencyMs: number }) | null {
    const session = this.sessions.get(id);
    if (!session) {
      return null;
    }

    const timeline = session.latencyTimeline;
    const recordedAt = Date.now();
    timeline.push({ value: latencyMs, recordedAt });

    const cutoff = recordedAt - this.options.jitterWindowMs;
    while (timeline.length > 0 && timeline[0]!.recordedAt < cutoff) {
      timeline.shift();
    }

    if (timeline.length > 50) {
      timeline.splice(0, timeline.length - 50);
    }

    const values = timeline.map((entry) => entry.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const jitterMs = Number((max - min).toFixed(2));
    const averageLatencyMs =
      values.reduce((sum, sample) => sum + sample, 0) / values.length;

    const packetLossRatio =
      session.totalTurns === 0
        ? 0
        : Number((session.failedTurns / session.totalTurns).toFixed(4));

    const rFactor = Math.max(0, 94.2 - averageLatencyMs / 40 - packetLossRatio * 250);
    const mosRaw = 1 + 0.035 * rFactor + 7e-6 * rFactor * (rFactor - 60) * (100 - rFactor);
    const mos = Number(Math.min(4.5, Math.max(1, mosRaw)).toFixed(2));

    const qualitySample: SessionQualitySample = {
      jitterMs,
      packetLossRatio,
      mos,
      recordedAt,
    };

    session.lastQualitySample = qualitySample;

    return {
      averageLatencyMs: Number(averageLatencyMs.toFixed(2)),
      ...qualitySample,
    };
  }

  recordFailure(id: string): void {
    const session = this.sessions.get(id);
    if (!session) {
      return;
    }

    session.consecutiveFailures += 1;
    session.failedTurns += 1;
    session.totalTurns += 1;
    session.lastUtteranceAt = Date.now();
  }

  recordSuccess(id: string): void {
    const session = this.sessions.get(id);
    if (!session) {
      return;
    }

    session.totalTurns += 1;
    session.consecutiveFailures = 0;
    session.lastUtteranceAt = Date.now();
  }

  resetFailureCounter(id: string): void {
    const session = this.sessions.get(id);
    if (!session) {
      return;
    }

    session.consecutiveFailures = 0;
  }

  recordQualitySample(id: string, sample: SessionQualitySample): void {
    const session = this.sessions.get(id);
    if (!session) {
      return;
    }

    session.lastQualitySample = sample;
  }

  cleanupExpired(now = Date.now()): string[] {
    const evicted: string[] = [];
    for (const [id, session] of this.sessions) {
      const lastActivity = session.lastUtteranceAt ?? session.createdAt;
      if (now - lastActivity >= this.options.sessionTtlMs) {
        this.sessions.delete(id);
        evicted.push(id);
      }
    }

    return evicted;
  }

  snapshot(): SessionState[] {
    return Array.from(this.sessions.values());
  }
}
