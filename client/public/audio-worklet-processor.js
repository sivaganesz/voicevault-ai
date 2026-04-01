// AudioWorkletProcessor for capturing raw PCM audio
// Runs on a separate audio thread for non-blocking processing

class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Optimization: reduced from 2048 (~128ms) to 1024 (~64ms) at 16kHz.
    // Smaller buffer = audio reaches Gemini faster = lower perceived latency.
    this.bufferSize = 1024;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0]; // mono channel

    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];

      if (this.bufferIndex >= this.bufferSize) {
        // Convert Float32 to Int16 PCM
        const pcmData = new Int16Array(this.bufferSize);
        for (let j = 0; j < this.bufferSize; j++) {
          const s = Math.max(-1, Math.min(1, this.buffer[j]));
          pcmData[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Post the PCM buffer to the main thread (transferable for zero-copy)
        this.port.postMessage(
          { type: 'audio', pcmData: pcmData.buffer },
          [pcmData.buffer]
        );

        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);