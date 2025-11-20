/**
 * LiveKit WebRTC Client Wrapper
 * Handles room connections, audio streaming, and track management
 */

class LiveKitVoiceClient {
    constructor() {
        this.room = null;
        this.audioTrack = null;
        this.isConnected = false;
        this.isMuted = false;
        this.onStateChange = null;
        this.onAudioLevel = null;
    }

    /**
     * Connect to LiveKit room
     */
    async connect(livekitUrl, token, roomName) {
        try {
            // Check if LiveKit is loaded - try different global names
            const LiveKitClient = window.LivekitClient || window.LiveKit;

            if (!LiveKitClient) {
                console.error('LiveKit check failed:', {
                    LivekitClient: typeof window.LivekitClient,
                    LiveKit: typeof window.LiveKit,
                    allGlobals: Object.keys(window).filter(k => k.toLowerCase().includes('live'))
                });
                throw new Error('LiveKit SDK not loaded. Check browser console for details.');
            }

            console.log('Using LiveKit client:', LiveKitClient);

            // Create room instance
            this.room = new LiveKitClient.Room({
                adaptiveStream: true,
                dynacast: true,
                audioCaptureDefaults: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            // Set up event listeners
            this.setupEventListeners();

            // Connect to room
            await this.room.connect(livekitUrl, token);

            this.isConnected = true;
            this.emitStateChange('connected');

            // Enable microphone
            await this.enableMicrophone();

            return { success: true };
        } catch (error) {
            console.error('Failed to connect to LiveKit:', error);
            this.emitStateChange('error', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Enable microphone and publish audio track
     */
    async enableMicrophone() {
        try {
            await this.room.localParticipant.setMicrophoneEnabled(true);

            // Get the audio track
            const tracks = Array.from(this.room.localParticipant.audioTracks.values());
            if (tracks.length > 0) {
                const publication = tracks[0];
                this.audioTrack = publication.audioTrack;

                // Monitor audio levels
                this.startAudioLevelMonitoring();
            }

            this.emitStateChange('microphone_enabled');
        } catch (error) {
            console.error('Failed to enable microphone:', error);
            throw error;
        }
    }

    /**
     * Monitor audio levels for visualization
     */
    startAudioLevelMonitoring() {
        if (!this.audioTrack) return;

        // Create audio context for level monitoring
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        // Connect track to analyser
        const stream = new MediaStream([this.audioTrack.mediaStreamTrack]);
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkLevel = () => {
            if (!this.isConnected) {
                audioContext.close();
                return;
            }

            analyser.getByteFrequencyData(dataArray);

            // Calculate average volume
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const normalizedLevel = average / 255;

            if (this.onAudioLevel) {
                this.onAudioLevel(normalizedLevel, dataArray);
            }

            requestAnimationFrame(checkLevel);
        };

        checkLevel();
    }

    /**
     * Set up room event listeners
     */
    setupEventListeners() {
        // Track subscribed (agent audio)
        this.room.on(window.LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
            console.log('Track subscribed:', track.kind, 'from', participant.identity);

            if (track.kind === window.LivekitClient.Track.Kind.Audio) {
                // Attach agent audio to page (automatically plays)
                const audioElement = track.attach();
                document.body.appendChild(audioElement);
                this.emitStateChange('agent_audio_connected');
            }
        });

        // Connection quality changed
        this.room.on(window.LivekitClient.RoomEvent.ConnectionQualityChanged, (quality, participant) => {
            console.log('Connection quality:', quality);
        });

        // Disconnected
        this.room.on(window.LivekitClient.RoomEvent.Disconnected, () => {
            console.log('Disconnected from room');
            this.isConnected = false;
            this.emitStateChange('disconnected');
        });

        // Reconnecting
        this.room.on(window.LivekitClient.RoomEvent.Reconnecting, () => {
            console.log('Reconnecting...');
            this.emitStateChange('reconnecting');
        });

        // Reconnected
        this.room.on(window.LivekitClient.RoomEvent.Reconnected, () => {
            console.log('Reconnected');
            this.isConnected = true;
            this.emitStateChange('reconnected');
        });
    }

    /**
     * Toggle mute state
     */
    async toggleMute() {
        if (!this.room) return false;

        try {
            this.isMuted = !this.isMuted;
            await this.room.localParticipant.setMicrophoneEnabled(!this.isMuted);
            this.emitStateChange(this.isMuted ? 'muted' : 'unmuted');
            return this.isMuted;
        } catch (error) {
            console.error('Failed to toggle mute:', error);
            return this.isMuted;
        }
    }

    /**
     * Disconnect from room
     */
    async disconnect() {
        if (this.room) {
            await this.room.disconnect();
            this.room = null;
            this.audioTrack = null;
            this.isConnected = false;
            this.emitStateChange('disconnected');
        }
    }

    /**
     * Emit state change event
     */
    emitStateChange(state, data = null) {
        if (this.onStateChange) {
            this.onStateChange(state, data);
        }
    }
}

// Export for use in app.js
window.LiveKitVoiceClient = LiveKitVoiceClient;
