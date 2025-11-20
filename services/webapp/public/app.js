/**
 * Voice Agent Web Application
 * Main application logic for call management and real-time metrics
 */

class VoiceAgentApp {
    constructor() {
        this.livekitClient = new LiveKitVoiceClient();
        this.sessionId = null;
        this.roomName = null;
        this.callStartTime = null;
        this.metricsInterval = null;
        this.durationInterval = null;

        // UI Elements
        this.elements = {
            startCallBtn: document.getElementById('start-call-btn'),
            muteBtn: document.getElementById('mute-btn'),
            endCallBtn: document.getElementById('end-call-btn'),
            callState: document.getElementById('call-state'),
            connectionStatus: document.getElementById('connection-status'),
            sessionInfo: document.getElementById('session-info'),
            sessionIdDisplay: document.getElementById('session-id-display'),
            callDuration: document.getElementById('call-duration'),
            visualizerCanvas: document.getElementById('visualizer-canvas'),
            audioVisualizer: document.getElementById('audio-visualizer'),
            errorToast: document.getElementById('error-toast'),
            toastMessage: document.getElementById('toast-message'),
            metricsRefresh: document.getElementById('metrics-refresh'),
        };

        this.init();
    }

    init() {
        // Set up event listeners
        this.elements.startCallBtn.addEventListener('click', () => this.startCall());
        this.elements.muteBtn.addEventListener('click', () => this.toggleMute());
        this.elements.endCallBtn.addEventListener('click', () => this.endCall());

        // Outbound calling
        const callPhoneBtn = document.getElementById('call-phone-btn');
        if (callPhoneBtn) {
            callPhoneBtn.addEventListener('click', () => this.makeOutboundCall());
        }

        // Set up LiveKit client callbacks
        this.livekitClient.onStateChange = (state, data) => this.handleLiveKitState(state, data);
        this.livekitClient.onAudioLevel = (level, frequencyData) => this.updateAudioVisualizer(level, frequencyData);

        // Initialize visualizer
        this.initVisualizer();

        console.log('Voice Agent App initialized');
    }

    /**
   * Start a new call (DEMO MODE)
   */
    async startCall() {
        try {
            this.setCallState('connecting');
            this.elements.startCallBtn.disabled = true;

            // Call backend API to create session
            const response = await fetch('/api/calls/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userName: `User-${Date.now().toString().slice(-4)}`,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to start call');
            }

            const data = await response.json();
            this.sessionId = data.sessionId;
            this.roomName = data.roomName;

            // Update UI
            this.elements.sessionIdDisplay.textContent = this.sessionId.substring(0, 16) + '...';
            this.elements.sessionInfo.style.display = 'block';

            // DEMO MODE: Simulate successful connection
            console.log('🎭 DEMO MODE: Simulating voice call...');
            await this.simulateConnection();

            this.setCallState('active');
            this.callStartTime = Date.now();

            // Enable call controls
            this.elements.muteBtn.disabled = false;
            this.elements.endCallBtn.disabled = false;
            this.elements.startCallBtn.disabled = true;

            // Start simulations
            this.startMetricsSimulation();
            this.startAudioSimulation();
            this.startDurationCounter();

            this.updateConnectionStatus('Connected (Demo Mode)');

        } catch (error) {
            console.error('Failed to start call:', error);
            this.showError(error.message);
            this.setCallState('idle');
            this.elements.startCallBtn.disabled = false;
        }
    }

    /**
     * Simulate connection delay
     */
    async simulateConnection() {
        // Simulate connection time
        await new Promise(resolve => setTimeout(resolve, 1500));
        this.elements.audioVisualizer.classList.add('active');
    }

    /**
     * Simulate realistic metrics
     */
    startMetricsSimulation() {
        let turnCount = 0;
        let bargeInCount = 0;
        let failedTurns = 0;

        // Update metrics every 2 seconds
        this.metricsInterval = setInterval(() => {
            if (!this.sessionId) return;

            // Simulate conversation turns
            if (Math.random() > 0.7) {
                turnCount++;

                // Occasionally fail a turn
                if (Math.random() > 0.95) {
                    failedTurns++;
                }

                // Occasionally barge-in
                if (Math.random() > 0.85) {
                    bargeInCount++;
                }
            }

            // Realistic latency with variation (target: <600ms)
            const baseLatency = 280 + Math.random() * 200; // 280-480ms
            const pipelineLatency = Math.floor(baseLatency + (Math.random() - 0.5) * 100);
            const agentLatency = Math.floor(150 + Math.random() * 100); // 150-250ms
            const avgLatency = Math.floor((pipelineLatency + agentLatency) / 2);

            // Jitter (variation in latency)
            const jitter = (Math.random() * 30 + 10).toFixed(1); // 10-40ms

            // MOS Score (Mean Opinion Score, 1-5)
            const mosBase = pipelineLatency < 400 ? 4.2 : pipelineLatency < 600 ? 3.8 : 3.2;
            const mos = (mosBase + (Math.random() - 0.5) * 0.4).toFixed(2);

            // Packet loss (very low for good connection)
            const packetLoss = (Math.random() * 0.02).toFixed(2); // 0-2%

            // Success rate
            const successRate = turnCount > 0
                ? (((turnCount - failedTurns) / turnCount) * 100).toFixed(1)
                : '100.0';

            // Update UI
            document.getElementById('metric-pipeline-latency').textContent = pipelineLatency;
            document.getElementById('metric-agent-latency').textContent = agentLatency;
            document.getElementById('metric-avg-latency').textContent = avgLatency;
            document.getElementById('metric-jitter').textContent = jitter;
            document.getElementById('metric-mos').textContent = mos;
            document.getElementById('metric-packet-loss').textContent = packetLoss + '%';
            document.getElementById('metric-bargein').textContent = bargeInCount;
            document.getElementById('metric-success-rate').textContent = successRate + '%';

            // Update status
            const statusEl = document.getElementById('metric-pipeline-status');
            if (pipelineLatency < 400) {
                statusEl.textContent = 'Excellent';
                statusEl.className = 'metric-status excellent';
            } else if (pipelineLatency < 600) {
                statusEl.textContent = 'Good';
                statusEl.className = 'metric-status good';
            } else if (pipelineLatency < 800) {
                statusEl.textContent = 'Acceptable';
                statusEl.className = 'metric-status warning';
            } else {
                statusEl.textContent = 'Poor';
                statusEl.className = 'metric-status poor';
            }

            // Blink refresh indicator
            this.elements.metricsRefresh.style.opacity = '1';
            setTimeout(() => {
                this.elements.metricsRefresh.style.opacity = '0.3';
            }, 200);

        }, 2000);
    }

    /**
   * Start real audio capture from microphone
   */
    async startAudioSimulation() {
        try {
            // Request microphone permission
            console.log('🎤 Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });

            console.log('✅ Microphone access granted!');

            // Create audio context and analyser
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;

            // Connect microphone to analyser
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            // Store for cleanup
            this.audioStream = stream;
            this.audioContext = audioContext;

            // Animate real-time audio visualization
            const animate = () => {
                if (!this.sessionId) {
                    // Stop if call ended
                    if (this.audioStream) {
                        this.audioStream.getTracks().forEach(track => track.stop());
                        this.audioContext?.close();
                    }
                    return;
                }

                // Get real frequency data from microphone
                analyser.getByteFrequencyData(dataArray);

                // Calculate average volume level
                const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
                const normalizedLevel = average / 255;

                // Update visualizer with REAL audio data
                this.updateAudioVisualizer(normalizedLevel, dataArray);

                requestAnimationFrame(animate);
            };

            animate();

        } catch (error) {
            console.error('Failed to access microphone:', error);
            this.showError('Microphone access denied. Please grant permission and try again.');

            // Fall back to simulated audio
            this.startSimulatedAudio();
        }
    }

    /**
     * Fallback: Simulate audio visualization (old behavior)
     */
    startSimulatedAudio() {
        console.log('📢 Using simulated audio (microphone not available)');
        let audioActive = false;
        let intensity = 0;

        const animate = () => {
            if (!this.sessionId) return;

            // Randomly activate "voice" every few seconds
            if (Math.random() > 0.98) {
                audioActive = true;
                intensity = 0.7 + Math.random() * 0.3;
                setTimeout(() => { audioActive = false; }, 1000 + Math.random() * 2000);
            }

            // Generate frequency data
            const frequencyData = new Uint8Array(128);
            for (let i = 0; i < frequencyData.length; i++) {
                if (audioActive) {
                    const frequency = Math.sin(i / 10) * 0.5 + 0.5;
                    frequencyData[i] = Math.floor(intensity * frequency * 255 * (Math.random() * 0.3 + 0.7));
                } else {
                    frequencyData[i] = Math.floor(Math.random() * 20);
                }
            }

            this.updateAudioVisualizer(audioActive ? intensity : 0, frequencyData);
            requestAnimationFrame(animate);
        };

        animate();
    }

    /**
     * Make an outbound call via Twilio
     */
    async makeOutboundCall() {
        const phoneInput = document.getElementById('phone-number-input');
        const phoneNumber = phoneInput.value.trim();

        if (!phoneNumber) {
            this.showError('Please enter a phone number');
            return;
        }

        // Validate phone number format
        if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
            this.showError('Invalid format. Use E.164 format (e.g., +1234567890)');
            return;
        }

        try {
            const response = await fetch('/api/calls/outbound', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber,
                    greeting: 'Hello! This is your AI assistant calling.'
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert(`📞 Demo Mode: In production, this would call ${phoneNumber}\n\n` +
                    `To enable real calls:\n` +
                    `1. Verify ${phoneNumber} in Twilio Console\n` +
                    `2. Configure gateway service with Twilio credentials\n` +
                    `3. Set up webhook URL\n\n` +
                    `For now, use the web interface with microphone!`);
                phoneInput.value = '';
            } else {
                this.showError(data.message || 'Failed to initiate call');
            }
        } catch (error) {
            console.error('Outbound call error:', error);
            this.showError('Failed to make call');
        }
    }

    /**
   * Toggle microphone mute
   */
    async toggleMute() {
        this.isMuted = !this.isMuted;

        // Actually mute/unmute the audio stream
        if (this.audioStream) {
            this.audioStream.getAudioTracks().forEach(track => {
                track.enabled = !this.isMuted;
            });
        }

        // Update button
        this.elements.muteBtn.innerHTML = this.isMuted
            ? '<span class="btn-icon">🔇</span><span class="btn-text">Unmute</span>'
            : '<span class="btn-icon">🎤</span><span class="btn-text">Mute</span>';

        // Visual feedback
        if (this.isMuted) {
            this.elements.audioVisualizer.style.opacity = '0.5';
        } else {
            this.elements.audioVisualizer.style.opacity = '1';
        }
    }

    /**
   * End the call (DEMO MODE)
   */
    async endCall() {
        try {
            this.setCallState('ending');

            // Stop intervals
            if (this.metricsInterval) {
                clearInterval(this.metricsInterval);
                this.metricsInterval = null;
            }

            if (this.durationInterval) {
                clearInterval(this.durationInterval);
                this.durationInterval = null;
            }

            // Call backend to end session (for demo metrics)
            if (this.sessionId) {
                await fetch(`/api/calls/${this.sessionId}`, {
                    method: 'DELETE',
                });
            }

            // Stop audio stream and close context
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
                this.audioStream = null;
            }
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }

            // Reset UI
            this.setCallState('idle');
            this.elements.muteBtn.disabled = true;
            this.elements.endCallBtn.disabled = true;
            this.elements.startCallBtn.disabled = false;
            this.elements.sessionInfo.style.display = 'none';
            this.elements.audioVisualizer.classList.remove('active');

            this.sessionId = null;
            this.callStartTime = null;

            this.updateConnectionStatus('Ready');
            this.resetMetrics();

        } catch (error) {
            console.error('Failed to end call:', error);
            this.showError('Failed to end call properly');
        }
    }

    /**
     * Handle LiveKit state changes
     */
    handleLiveKitState(state, data) {
        console.log('LiveKit state:', state, data);

        switch (state) {
            case 'connected':
                this.elements.audioVisualizer.classList.add('active');
                break;
            case 'microphone_enabled':
                console.log('Microphone enabled');
                break;
            case 'disconnected':
                if (this.sessionId) {
                    this.endCall();
                }
                break;
            case 'error':
                this.showError(data || 'Connection error');
                break;
        }
    }

    /**
     * Start polling for metrics
     */
    startMetricsPolling() {
        // Initial fetch
        this.fetchMetrics();

        // Poll every 2 seconds
        this.metricsInterval = setInterval(() => {
            this.fetchMetrics();
        }, 2000);
    }

    /**
     * Fetch metrics from backend
     */
    async fetchMetrics() {
        if (!this.sessionId) return;

        try {
            const response = await fetch(`/api/calls/${this.sessionId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn('Session not found on backend');
                    return;
                }
                throw new Error('Failed to fetch metrics');
            }

            const data = await response.json();
            this.updateMetrics(data);

            // Blink refresh indicator
            this.elements.metricsRefresh.style.opacity = '1';
            setTimeout(() => {
                this.elements.metricsRefresh.style.opacity = '0.3';
            }, 200);

        } catch (error) {
            console.error('Failed to fetch metrics:', error);
        }
    }

    /**
     * Update metrics display
     */
    updateMetrics(data) {
        // Pipeline Latency (from last quality sample)
        if (data.lastQualitySample) {
            const latencyTimeline = data.latencyTimeline || [];
            if (latencyTimeline.length > 0) {
                const lastLatency = latencyTimeline[latencyTimeline.length - 1].value;
                document.getElementById('metric-pipeline-latency').textContent = lastLatency.toFixed(0);

                // Update status based on latency
                const statusEl = document.getElementById('metric-pipeline-status');
                if (lastLatency < 400) {
                    statusEl.textContent = 'Excellent';
                    statusEl.className = 'metric-status excellent';
                } else if (lastLatency < 600) {
                    statusEl.textContent = 'Good';
                    statusEl.className = 'metric-status good';
                } else if (lastLatency < 800) {
                    statusEl.textContent = 'Acceptable';
                    statusEl.className = 'metric-status warning';
                } else {
                    statusEl.textContent = 'Poor';
                    statusEl.className = 'metric-status poor';
                }
            }

            // Average Latency
            const avgLatency = latencyTimeline.reduce((sum, item) => sum + item.value, 0) / latencyTimeline.length;
            if (!isNaN(avgLatency)) {
                document.getElementById('metric-avg-latency').textContent = avgLatency.toFixed(0);
            }

            // Jitter
            const jitter = data.lastQualitySample.jitterMs;
            document.getElementById('metric-jitter').textContent = jitter.toFixed(1);

            // MOS Score
            const mos = data.lastQualitySample.mos;
            document.getElementById('metric-mos').textContent = mos.toFixed(2);

            // Packet Loss
            const packetLoss = (data.lastQualitySample.packetLossRatio * 100).toFixed(2);
            document.getElementById('metric-packet-loss').textContent = packetLoss + '%';
        }

        // Barge-in Count
        const bargeInCount = data.bargeInCount || 0;
        document.getElementById('metric-bargein').textContent = bargeInCount;

        // Success Rate
        const totalTurns = data.totalTurns || 0;
        const failedTurns = data.failedTurns || 0;
        if (totalTurns > 0) {
            const successRate = ((totalTurns - failedTurns) / totalTurns * 100).toFixed(1);
            document.getElementById('metric-success-rate').textContent = successRate + '%';
        }

        // Agent Latency - would come from turn data, for now use placeholder
        // This would be updated when we actually process utterances
    }

    /**
     * Reset all metrics to default state
     */
    resetMetrics() {
        document.getElementById('metric-pipeline-latency').textContent = '-';
        document.getElementById('metric-agent-latency').textContent = '-';
        document.getElementById('metric-avg-latency').textContent = '-';
        document.getElementById('metric-jitter').textContent = '-';
        document.getElementById('metric-mos').textContent = '-';
        document.getElementById('metric-bargein').textContent = '0';
        document.getElementById('metric-success-rate').textContent = '-';
        document.getElementById('metric-packet-loss').textContent = '-';

        document.getElementById('metric-pipeline-status').textContent = 'Waiting...';
        document.getElementById('metric-pipeline-status').className = 'metric-status';
    }

    /**
     * Initialize audio visualizer
     */
    initVisualizer() {
        this.visualizerCanvas = this.elements.visualizerCanvas;
        this.visualizerCtx = this.visualizerCanvas.getContext('2d');

        // Set canvas size
        this.visualizerCanvas.width = 400;
        this.visualizerCanvas.height = 100;
    }

    /**
     * Update audio visualizer
     */
    updateAudioVisualizer(level, frequencyData) {
        const canvas = this.visualizerCanvas;
        const ctx = this.visualizerCtx;
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.fillStyle = 'rgba(31, 32, 35, 0.3)';
        ctx.fillRect(0, 0, width, height);

        // Draw frequency bars
        const barWidth = width / frequencyData.length;
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#a855f7');
        gradient.addColorStop(1, '#ec4899');

        for (let i = 0; i < frequencyData.length; i++) {
            const barHeight = (frequencyData[i] / 255) * height;
            const x = i * barWidth;

            ctx.fillStyle = gradient;
            ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
        }
    }

    /**
     * Start call duration counter
     */
    startDurationCounter() {
        this.durationInterval = setInterval(() => {
            if (this.callStartTime) {
                const elapsed = Date.now() - this.callStartTime;
                const minutes = Math.floor(elapsed / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                this.elements.callDuration.textContent =
                    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    /**
     * Set call state
     */
    setCallState(state) {
        this.elements.callState.textContent = state.charAt(0).toUpperCase() + state.slice(1);
        this.elements.callState.className = 'call-state';

        if (state === 'active') {
            this.elements.callState.classList.add('active');
        }
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(status) {
        this.elements.connectionStatus.textContent = status;
    }

    /**
     * Show error toast
     */
    showError(message) {
        this.elements.toastMessage.textContent = message;
        this.elements.errorToast.classList.add('show');

        setTimeout(() => {
            this.elements.errorToast.classList.remove('show');
        }, 5000);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VoiceAgentApp();
});
