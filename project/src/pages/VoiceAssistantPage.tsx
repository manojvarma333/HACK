import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic, Square, Send, Volume2, Sparkles, Languages, Zap,
  CheckCircle2, AlertCircle, Loader2, Check, X, Pencil, Cpu, Wifi, WifiOff,
} from 'lucide-react';
import { PageContainer, PageHeader, Card, Badge, Button } from '@/components/ui';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useSpeech } from '@/hooks/useSpeech';
import { useMode } from '@/context/ModeContext';
import { api, ApiError, type VoiceProcessResponse } from '@/services/api';
import { formatRelativeTime } from '@/utils/format';

/** Voice UI states (PRD 17). */
type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'UPLOADING'
  | 'TRANSCRIBING'
  | 'UNDERSTANDING'
  | 'MATCHING'
  | 'CONFIRMATION'
  | 'EXECUTING'
  | 'RESPONDING'
  | 'ERROR';

const STATE_LABEL: Record<VoiceState, string> = {
  IDLE: 'Ready',
  LISTENING: '🎙️ Listening...',
  UPLOADING: '⬆️ Uploading audio...',
  TRANSCRIBING: '📝 Transcribing...',
  UNDERSTANDING: '🧠 Understanding your request...',
  MATCHING: '🔎 Matching product...',
  CONFIRMATION: '❓ Awaiting confirmation',
  EXECUTING: '⚙️ Updating inventory...',
  RESPONDING: '🔊 Responding...',
  ERROR: '⚠️ Something went wrong',
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  result?: VoiceProcessResponse;
  timestamp: string;
}

const sampleCommands = [
  'Add 5 kg rice',
  '5 kilo biyyam add cheyyi',
  'Cheeni 10 kilo add karo',
  'How much rice is left?',
  'Remove 2 kg sugar',
  'Correct rice stock to 80 kg',
];

// Minimal typing for the browser Web Speech recognition API.
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string; lang: string }>> }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function isBrowserSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function VoiceAssistantPage() {
  const { mode, setMode, status } = useMode();
  const recorder = useVoiceRecorder();
  const speech = useSpeech();
  const browserSpeechSupported = isBrowserSpeechSupported();

  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pending, setPending] = useState<VoiceProcessResponse | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  // Spoken language for the browser speech recognizer (used in both modes).
  const [spokenLang, setSpokenLang] = useState('te-IN');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      text: 'Namaste! I am your VoiceStock AI assistant. Speak or type a command like "Add 5 kg rice". I understand English, Hindi, and Telugu.',
      timestamp: new Date().toISOString(),
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending]);

  const pushUser = (text: string) =>
    setMessages((p) => [...p, { id: `u-${Date.now()}`, role: 'user', text, timestamp: new Date().toISOString() }]);

  const pushAssistant = useCallback(
    (result: VoiceProcessResponse) => {
      setMessages((p) => [
        ...p,
        { id: `a-${Date.now()}`, role: 'assistant', text: result.response_text, result, timestamp: new Date().toISOString() },
      ]);
      if (autoSpeak) speech.speak(result.response_text, result.tts?.lang ?? 'en-IN');
    },
    [autoSpeak, speech],
  );

  const applyResult = useCallback(
    (result: VoiceProcessResponse) => {
      setSessionId(result.session_id);
      if (result.requires_confirmation && (result.state === 'CONFIRMATION' || result.state === 'CLARIFY')) {
        setPending(result);
        setVoiceState('CONFIRMATION');
      } else {
        setPending(null);
        setVoiceState(result.state === 'ERROR' ? 'ERROR' : 'RESPONDING');
        setTimeout(() => setVoiceState('IDLE'), 1200);
      }
      pushAssistant(result);
    },
    [pushAssistant],
  );

  const handleError = useCallback((err: unknown) => {
    const message =
      err instanceof ApiError
        ? err.message
        : 'Sorry, something went wrong processing that command.';
    setVoiceState('ERROR');
    setMessages((p) => [
      ...p,
      { id: `e-${Date.now()}`, role: 'assistant', text: message, timestamp: new Date().toISOString() },
    ]);
    setTimeout(() => setVoiceState('IDLE'), 1500);
  }, []);

  // Send a fresh transcript through the pipeline.
  const runProcess = useCallback(
    async (text: string, lang?: string) => {
      if (!text.trim()) return;
      pushUser(text);
      setInput('');
      setVoiceState('UNDERSTANDING');
      try {
        const result = await api.voice.process(text, mode, pending ? sessionId : null, lang);
        if (result.state === 'CLARIFY' || result.state === 'CONFIRMATION') setVoiceState('MATCHING');
        applyResult(result);
      } catch (err) {
        handleError(err);
      }
    },
    [mode, pending, sessionId, applyResult, handleError],
  );

  // Answer a pending confirmation/clarification (yes / no / correction / choice).
  const runAnswer = useCallback(
    async (answer: string) => {
      if (!sessionId) return runProcess(answer);
      pushUser(answer);
      setInput('');
      setVoiceState('EXECUTING');
      try {
        const result = await api.voice.confirm(sessionId, answer, mode);
        applyResult(result);
      } catch (err) {
        handleError(err);
      }
    },
    [sessionId, mode, applyResult, handleError, runProcess],
  );

  const submitText = () => {
    const text = input.trim();
    if (!text) return;
    if (pending) runAnswer(text);
    else runProcess(text);
  };

  const cancelPending = useCallback(async () => {
    if (!sessionId) return;
    try {
      const result = await api.voice.cancel(sessionId, mode);
      applyResult(result);
    } catch (err) {
      handleError(err);
    }
  }, [sessionId, mode, applyResult, handleError]);

  // ---- Microphone handling ----
  // Browser Web Speech API is the primary transcription path in both modes.
  // Server-side Whisper (startRealRecording) is only a fallback when the
  // browser has no speech recognition.
  const stopBrowserRecognition = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  const startRealRecording = async () => {
    await recorder.start();
    setVoiceState('LISTENING');
  };

  const stopRealRecording = async () => {
    const blob = await recorder.stop();
    if (!blob) {
      setVoiceState('IDLE');
      return;
    }
    setVoiceState('UPLOADING');
    try {
      setVoiceState('TRANSCRIBING');
      // Force Whisper to the selected language ('auto' -> let Whisper detect).
      const langHint = spokenLang === 'auto' ? undefined : spokenLang;
      const { transcript } = await api.voice.transcribe(blob, 'real', langHint);
      if (!transcript.trim()) {
        handleError(new ApiError("I couldn't understand the audio. Please try again.", 0));
        return;
      }
      await runProcess(transcript, langHint);
    } catch (err) {
      handleError(err);
    }
  };

  const startBrowserRecognition = () => {
    const rec = getSpeechRecognition();
    if (!rec) {
      inputRef.current?.focus();
      setMessages((p) => [
        ...p,
        {
          id: `hint-${Date.now()}`,
          role: 'assistant',
          text: 'Speech recognition is not available in this browser. Please type your command, or use a Chromium-based browser (Chrome/Edge).',
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }
    recognitionRef.current = rec;
    rec.lang = spokenLang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      const detectedLang = e.results[0][0].lang; // e.g., 'te-IN', 'hi-IN', 'en-IN'
      setVoiceState('IDLE');
      runProcess(transcript, detectedLang);
    };
    rec.onerror = () => setVoiceState('IDLE');
    rec.onend = () => {
      setVoiceState((s) => (s === 'LISTENING' ? 'IDLE' : s));
      recognitionRef.current = null;
    };
    setVoiceState('LISTENING');
    rec.start();
  };

  const micActive = voiceState === 'LISTENING';
  const busy = ['UPLOADING', 'TRANSCRIBING', 'UNDERSTANDING', 'MATCHING', 'EXECUTING'].includes(voiceState);

  const onMicClick = () => {
    if (busy) return;
    if (micActive) {
      // Stop whichever capture path is active.
      if (recognitionRef.current) {
        stopBrowserRecognition();
        setVoiceState('IDLE');
      } else {
        stopRealRecording();
      }
      return;
    }
    // Prefer the browser Web Speech API for transcription in both modes.
    if (browserSpeechSupported) startBrowserRecognition();
    else if (mode === 'real' && (status?.whisper_available ?? false)) startRealRecording();
    else startBrowserRecognition(); // shows the unsupported hint
  };

  const modeReady =
    mode === 'simulation' ||
    browserSpeechSupported ||
    (status?.whisper_available ?? false);

  return (
    <PageContainer>
      <PageHeader
        title="Ask your inventory anything"
        subtitle="Speak naturally in English, Hindi, or Telugu"
        action={
          <div className="flex items-center gap-2">
            <Badge tone={mode === 'real' ? 'primary' : 'neutral'}>
              <Cpu className="w-3 h-3" /> {mode === 'real' ? 'Real Mode' : 'Simulation'}
            </Badge>
            <Badge tone="primary"><Languages className="w-3 h-3" /> Multilingual</Badge>
          </div>
        }
      />

      {/* Mode + status bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-800 p-1 bg-white dark:bg-gray-900">
          {(['simulation', 'real'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                mode === m
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {m === 'simulation' ? 'Simulation Mode' : 'Real Mode'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
            <Languages className="w-3.5 h-3.5" />
            <select
              value={spokenLang}
              onChange={(e) => setSpokenLang(e.target.value)}
              className="rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-1 text-gray-700 dark:text-gray-300"
              title="The language you will speak"
            >
              <option value="te-IN">తెలుగు (Telugu)</option>
              <option value="hi-IN">हिंदी (Hindi)</option>
              <option value="en-IN">English</option>
              <option value="auto">Auto-detect</option>
            </select>
          </label>
          <Badge tone={browserSpeechSupported ? 'success' : 'warning'}>
            {browserSpeechSupported ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            Web Speech {browserSpeechSupported ? 'ready' : 'off'}
          </Badge>
          {status && (
            <Badge tone={status.whisper_available ? 'success' : 'neutral'}>
              Whisper {status.whisper_available ? 'ready' : 'fallback'}
            </Badge>
          )}
          {status && (
            <Badge tone={status.gemini_available ? 'success' : 'neutral'}>
              Gemini {status.gemini_available ? 'ready' : 'fallback'}
            </Badge>
          )}
          <label className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 cursor-pointer select-none">
            <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} className="rounded" />
            Auto-speak
          </label>
        </div>
      </div>

      {mode === 'real' && !modeReady && (
        <div className="mb-4 rounded-lg border border-warning-300 bg-warning-50 dark:bg-warning-900/20 dark:border-warning-800 px-4 py-3 text-sm text-warning-800 dark:text-warning-300">
          Voice input needs the browser Web Speech API or a server Whisper backend, and neither is available right now. Please type your command instead.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col">
          <Card padding={false} className="flex flex-col h-[calc(100vh-320px)] min-h-[380px] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Conversation</span>
              </div>
              <Badge tone={micActive ? 'error' : busy ? 'warning' : 'success'}>
                <span className={`w-1.5 h-1.5 rounded-full ${micActive ? 'bg-error-500 animate-pulse' : busy ? 'bg-warning-500 animate-pulse' : 'bg-success-500'}`} />
                {STATE_LABEL[voiceState]}
              </Badge>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className="max-w-[80%]">
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary-600 text-white rounded-br-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                      }`}
                    >
                      {msg.text}
                      {msg.role === 'assistant' && speech.isSupported && (
                        <button
                          onClick={() => speech.speak(msg.text, msg.result?.tts?.lang ?? 'en-IN')}
                          className="ml-2 inline-flex align-middle text-gray-400 hover:text-primary-500"
                          title="Replay"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {msg.result && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone="primary"><Zap className="w-3 h-3" /> {msg.result.intent}</Badge>
                        <Badge tone="neutral">Confidence: {Math.round((msg.result.nlu.confidence ?? 0) * 100)}%</Badge>
                        {msg.result.product && <Badge tone="success"><CheckCircle2 className="w-3 h-3" /> {msg.result.product.name}</Badge>}
                        {msg.result.language && <Badge tone="neutral">{msg.result.language.toUpperCase()}</Badge>}
                        {(msg.result.nlu.confidence ?? 1) < 0.5 && <Badge tone="warning"><AlertCircle className="w-3 h-3" /> Low confidence</Badge>}
                      </div>
                    )}
                    <p className={`text-[10px] text-gray-400 mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                      {formatRelativeTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}

              {/* Confirmation / clarification card */}
              {pending && (
                <div className="flex justify-start animate-fade-in">
                  <div className="w-full max-w-[90%] rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/60 dark:bg-primary-900/20 p-4">
                    {pending.state === 'CLARIFY' && pending.candidates.length > 0 ? (
                      <>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">{pending.response_text}</p>
                        <div className="flex flex-wrap gap-2">
                          {pending.candidates.map((c) => (
                            <Button key={c.id} variant="secondary" size="sm" onClick={() => runAnswer(c.name)}>
                              {c.name}
                            </Button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-2 mb-3">
                          <AlertCircle className="w-4 h-4 text-primary-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{pending.response_text}</p>
                            {pending.product && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {pending.product.name}
                                {pending.normalized_quantity != null && pending.base_unit && (
                                  <> · {pending.normalized_quantity} {pending.base_unit}</>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="primary" size="sm" onClick={() => runAnswer('yes')} disabled={busy}>
                            <Check className="w-4 h-4" /> Confirm
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.focus()}>
                            <Pencil className="w-4 h-4" /> Change
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelPending} disabled={busy}>
                            <X className="w-4 h-4" /> Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {busy && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{STATE_LABEL[voiceState]}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitText()}
                  placeholder={pending ? 'Type a correction, or "yes" / "no"...' : 'Type a command or use the mic...'}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                />
                <Button variant="primary" size="md" onClick={submitText} disabled={!input.trim() || busy}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Microphone + live waveform */}
          <div className="flex flex-col items-center mt-6">
            <div className="relative flex items-center justify-center">
              {micActive && (
                <>
                  <span className="absolute inset-0 rounded-full bg-primary-500/30 animate-pulse-ring" />
                  <span className="absolute inset-0 rounded-full bg-primary-500/20 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
                </>
              )}
              <button
                onClick={onMicClick}
                disabled={busy}
                aria-label={micActive ? 'Stop recording' : 'Start voice command'}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg disabled:opacity-60 ${
                  micActive
                    ? 'bg-error-500 text-white scale-110 shadow-error-500/30'
                    : 'bg-primary-600 text-white hover:bg-primary-700 hover:scale-105 shadow-primary-600/30'
                }`}
              >
                {micActive ? <Square className="w-7 h-7" /> : <Mic className="w-8 h-8" />}
              </button>
            </div>

            {/* Real waveform driven by mic amplitude (Whisper fallback recording). */}
            {micActive && recorder.isRecording && (
              <div className="flex items-end gap-1 h-10 mt-4" aria-hidden>
                {Array.from({ length: 24 }).map((_, i) => {
                  const base = recorder.amplitude;
                  const h = 4 + base * 32 * (0.4 + Math.abs(Math.sin(i * 0.9 + base * 6)));
                  return <span key={i} className="w-1 rounded-full bg-primary-500" style={{ height: `${h}px` }} />;
                })}
              </div>
            )}

            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
              {micActive ? 'Tap to stop' : 'Tap to speak (browser recognition)'}
            </p>
            {recorder.error && <p className="text-center text-sm text-error-500 mt-1">{recorder.error}</p>}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Try These Commands</h3>
            <div className="space-y-2">
              {sampleCommands.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => (pending ? runAnswer(cmd) : runProcess(cmd))}
                  disabled={busy}
                  className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
                >
                  <Volume2 className="w-3.5 h-3.5 inline mr-2 text-primary-400" />
                  {cmd}
                </button>
              ))}
            </div>
          </Card>

          {/* AI pipeline for the latest command (PRD 47). */}
          {messages.some((m) => m.result?.pipeline?.length) && (
            <Card>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">AI Pipeline</h3>
              <ol className="space-y-2">
                {[...messages].reverse().find((m) => m.result?.pipeline?.length)?.result?.pipeline.map((stage, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        stage.status === 'ok' ? 'bg-success-500' : stage.status === 'error' ? 'bg-error-500' : 'bg-warning-500'
                      }`}
                    />
                    <span className="text-gray-700 dark:text-gray-300">{stage.stage}</span>
                    {stage.detail && <span className="text-xs text-gray-400 truncate">— {stage.detail}</span>}
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
