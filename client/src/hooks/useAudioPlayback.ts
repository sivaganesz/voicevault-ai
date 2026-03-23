import { useRef, useCallback } from 'react';

export interface AudioPlaybackHooks {
  enqueueAudio: (base64: string) => void;
  stopPlayback: () => void;
}

export function useAudioPlayback(): AudioPlaybackHooks {
  const audioContextRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<string[]>([]);
  const isPlayingRef = useRef<boolean>(false);
  const nextStartTimeRef = useRef<number>(0);

  const getAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const playChunk = useCallback((base64Audio: string) => {
    const ctx = getAudioContext();

    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    const startTime = Math.max(currentTime, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + audioBuffer.duration;

    isPlayingRef.current = true;
    source.onended = () => {
      if (queueRef.current.length > 0) {
        const nextChunk = queueRef.current.shift()!;
        playChunk(nextChunk);
      } else {
        isPlayingRef.current = false;
      }
    };
  }, [getAudioContext]);

  const enqueueAudio = useCallback((base64Audio: string) => {
    if (!base64Audio) return;
    playChunk(base64Audio);
  }, [playChunk]);

  const stopPlayback = useCallback(() => {
    queueRef.current = [];
    isPlayingRef.current = false;
    nextStartTimeRef.current = 0;
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  return { enqueueAudio, stopPlayback };
}