import { useState, useRef, useEffect } from 'react';
import {
  Mic, Send, Volume2, Sparkles, Languages, Zap,
  CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import { PageContainer, PageHeader, Card, Badge, Button } from '@/components/ui';
import { voiceService, type VoiceParseResult } from '@/services/voiceService';
import { mockService } from '@/services/mockService';
import { formatRelativeTime } from '@/utils/format';
import type { VoiceInteraction } from '@/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  transcript?: string;
  result?: VoiceParseResult;
  timestamp: string;
}

const sampleCommands = [
  'Add 5 kg rice',
  '5 kilo biyyam add cheyyi',
  'Do kilo cheeni nikaal do',
  'How much rice is left?',
  'No, make it 5 kg',
];

export function VoiceAssistantPage() {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      text: 'Namaste! I am your VoiceStock AI assistant. Try saying or typing a command like "Add 5 kg rice". I understand English, Hindi, and Telugu.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [history, setHistory] = useState<VoiceInteraction[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mockService.getVoiceInteractions().then(setHistory);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function processCommand(text: string) {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setProcessing(true);

    try {
      const result = await voiceService.parseCommand(text);
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: result.response,
        result,
        timestamp: new Date().toISOString(),
      };
      setMessages((p) => [...p, aiMsg]);
    } catch {
      setMessages((p) => [...p, {
        id: `e-${Date.now()}`,
        role: 'assistant',
        text: 'Sorry, something went wrong processing that command.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setProcessing(false);
    }
  }

  function simulateVoice() {
    if (listening) {
      setListening(false);
      const cmd = sampleCommands[Math.floor(Math.random() * sampleCommands.length)];
      setInput(cmd);
      return;
    }
    setListening(true);
    setTimeout(() => {
      setListening(false);
      const cmd = sampleCommands[Math.floor(Math.random() * sampleCommands.length)];
      processCommand(cmd);
    }, 2000);
  }

  return (
    <PageContainer>
      <PageHeader
        title="Voice Assistant"
        subtitle="Speak naturally in English, Hindi, or Telugu"
        action={<Badge tone="primary"><Languages className="w-3 h-3" /> Multilingual</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col">
          <Card padding={false} className="flex flex-col h-[calc(100vh-280px)] min-h-[400px] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Conversation</span>
              </div>
              <Badge tone={listening ? 'error' : 'success'}>
                <span className={`w-1.5 h-1.5 rounded-full ${listening ? 'bg-error-500 animate-pulse' : 'bg-success-500'}`} />
                {listening ? 'Listening...' : 'Ready'}
              </Badge>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[80%] ${msg.role === 'user' ? '' : ''}`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary-600 text-white rounded-br-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.result && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone="primary"><Zap className="w-3 h-3" /> {msg.result.intent}</Badge>
                        <Badge tone="neutral">Confidence: {Math.round(msg.result.confidence * 100)}%</Badge>
                        {msg.result.product && <Badge tone="success"><CheckCircle2 className="w-3 h-3" /> {msg.result.product.name}</Badge>}
                        {msg.result.confidence < 0.5 && <Badge tone="warning"><AlertCircle className="w-3 h-3" /> Low confidence</Badge>}
                      </div>
                    )}
                    <p className={`text-[10px] text-gray-400 mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                      {formatRelativeTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              {processing && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Processing...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && processCommand(input)}
                  placeholder="Type a command or use the mic..."
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                />
                <Button variant="primary" size="md" onClick={() => processCommand(input)} disabled={!input.trim() || processing}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          <div className="flex justify-center mt-6">
            <div className="relative">
              {listening && (
                <>
                  <span className="absolute inset-0 rounded-full bg-primary-500/30 animate-pulse-ring" />
                  <span className="absolute inset-0 rounded-full bg-primary-500/20 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
                </>
              )}
              <button
                onClick={simulateVoice}
                disabled={processing}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  listening
                    ? 'bg-error-500 text-white scale-110 shadow-error-500/30'
                    : 'bg-primary-600 text-white hover:bg-primary-700 hover:scale-105 shadow-primary-600/30'
                }`}
              >
                <Mic className="w-8 h-8" />
              </button>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
            {listening ? 'Tap to stop' : 'Tap to speak (demo mode)'}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Try These Commands</h3>
            <div className="space-y-2">
              {sampleCommands.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => processCommand(cmd)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5 inline mr-2 text-primary-400" />
                  {cmd}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Recent Voice History</h3>
            <div className="space-y-3">
              {history.slice(0, 5).map((v) => (
                <div key={v.id} className="text-sm">
                  <p className="text-gray-900 dark:text-gray-100 font-medium truncate">"{v.transcript}"</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge tone="neutral">{v.language.toUpperCase()}</Badge>
                    <span className="text-xs text-gray-400">{formatRelativeTime(v.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
