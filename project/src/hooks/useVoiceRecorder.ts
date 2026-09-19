import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Microphone capture via MediaRecorder + live amplitude for a real waveform.
 * Real Mode only — nothing here is faked. Returns audio as a Blob on stop.
 */
export interface VoiceRecorderState {
  isRecording: boolean;
  isSupported: boolean;
  error: string | null;
  /** 0..1 live amplitude, updated while recording (for the waveform). */
  amplitude: number;
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>({
    isRecording: false,
    isSupported:
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined',
    error: null,
    amplitude: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const resolveRef = useRef<((blob: Blob | null) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => undefined);
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    setState((s) => ({ ...s, amplitude: Math.min(1, rms * 3) }));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    if (!state.isSupported) {
      setState((s) => ({ ...s, error: 'Recording is not supported in this browser.' }));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        cleanup();
        setState((s) => ({ ...s, isRecording: false, amplitude: 0 }));
        resolveRef.current?.(blob.size > 0 ? blob : null);
        resolveRef.current = null;
      };

      // Live amplitude for the waveform.
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      tick();

      recorder.start();
      setState((s) => ({ ...s, isRecording: true, error: null }));
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access is required for voice commands. Enable it in your browser settings.'
          : 'Could not start recording. Please check your microphone.';
      cleanup();
      setState((s) => ({ ...s, isRecording: false, error: message }));
    }
  }, [state.isSupported, tick, cleanup]);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }
      resolveRef.current = resolve;
      recorder.stop();
    });
  }, []);

  return { ...state, start, stop };
}
