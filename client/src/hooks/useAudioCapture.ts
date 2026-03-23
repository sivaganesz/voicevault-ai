import { useState, useRef, useCallback } from 'react';

export interface AudioCaptureHooks {
  isCapturing: boolean;
  startCapture: () => Promise<void>;
  stopCapture: () => void;
}

export function useAudioCapture(onAudioChunk: (base64: string) => void): AudioCaptureHooks {
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      await audioContext.audioWorklet.addModule('/audio-worklet-processor.js');

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');
      workletNodeRef.current = workletNode;

      let chunkCount = 0;
      workletNode.port.onmessage = (event: MessageEvent) => {
        if (event.data.type === 'audio') {
          chunkCount++;
          if (chunkCount === 1 || chunkCount % 50 === 0) {
            console.log(`🎙️ Captured audio chunk #${chunkCount}`);
          }
          const pcmData = new Uint8Array(event.data.pcmData);
          const base64 = arrayBufferToBase64(pcmData);
          onAudioChunk(base64);
        }
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      setIsCapturing(true);
      console.log('🎙️ Audio capture started');
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      throw error;
    }
  }, [onAudioChunk]);

  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsCapturing(false);
    console.log('🎙️ Audio capture stopped');
  }, []);

  return { isCapturing, startCapture, stopCapture };
}

function arrayBufferToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}