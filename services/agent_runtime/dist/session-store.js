export class SessionStore {
    sessions = new Map();
    create(input) {
        const id = input.callSid;
        const now = Date.now();
        const state = {
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
    get(id) {
        return this.sessions.get(id);
    }
    delete(id) {
        this.sessions.delete(id);
    }
    /**
     * Marks the beginning of a new user utterance. Returns true if an agent response
     * was still playing, signalling that barge-in handling is required.
     */
    markUtteranceStart(id) {
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
    markTtsComplete(id) {
        const session = this.sessions.get(id);
        if (!session) {
            return;
        }
        session.ttsInFlight = false;
    }
    snapshot() {
        return Array.from(this.sessions.values());
    }
}
//# sourceMappingURL=session-store.js.map