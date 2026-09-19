import { useMemo, useState } from 'react';
import { History, Mic, Search, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { PageContainer, PageHeader, Card, Badge, Input } from '@/components/ui';
import { useData } from '@/context/DataContext';
import { formatRelativeTime } from '@/utils/format';
import type { ApiVoiceHistory } from '@/services/api';

function statusTone(status: string): 'success' | 'error' | 'warning' | 'neutral' {
  const s = status.toLowerCase();
  if (s.includes('execut') || s.includes('done') || s.includes('success') || s.includes('confirm')) return 'success';
  if (s.includes('error') || s.includes('fail') || s.includes('cancel')) return 'error';
  if (s.includes('clarif') || s.includes('pending') || s.includes('unknown')) return 'warning';
  return 'neutral';
}

function StatusIcon({ status }: { status: string }) {
  const tone = statusTone(status);
  if (tone === 'success') return <CheckCircle2 className="w-4 h-4 text-success-500" />;
  if (tone === 'error') return <XCircle className="w-4 h-4 text-error-500" />;
  return <HelpCircle className="w-4 h-4 text-warning-500" />;
}

function operationText(v: ApiVoiceHistory): string {
  if (v.product_name && v.quantity != null) {
    const verb = v.intent?.includes('remove') ? 'Removed' : v.intent?.includes('add') ? 'Added' : 'Updated';
    return `${verb} ${v.quantity}${v.unit ? ' ' + v.unit : ''} · ${v.product_name}`;
  }
  if (v.product_name) return v.product_name;
  return v.intent ?? '—';
}

export function VoiceHistoryPage() {
  const { voiceHistory } = useData();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return voiceHistory.filter(
      (v) =>
        v.transcript.toLowerCase().includes(q) ||
        (v.product_name ?? '').toLowerCase().includes(q) ||
        (v.intent ?? '').toLowerCase().includes(q),
    );
  }, [voiceHistory, query]);

  return (
    <PageContainer>
      <PageHeader title="Voice History" subtitle={`${voiceHistory.length} voice commands processed`} />

      <div className="mb-6 max-w-md">
        <Input placeholder="Search transcripts, products, intents..." value={query} onChange={(e) => setQuery(e.target.value)} icon={<Search className="w-4 h-4" />} />
      </div>

      <Card padding={false} className="overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {filtered.map((v) => (
            <div key={v.id} className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">"{v.transcript}"</p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatRelativeTime(v.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{operationText(v)}</p>
                  {v.response && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">↳ {v.response}</p>}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge tone={statusTone(v.status)}><StatusIcon status={v.status} /> {v.status}</Badge>
                    {v.intent && <Badge tone="info">{v.intent}</Badge>}
                    {v.language && <Badge tone="neutral">{v.language.toUpperCase()}</Badge>}
                    {v.confidence != null && <Badge tone="neutral">{Math.round(v.confidence * 100)}%</Badge>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No voice commands yet. Head to the Voice Assistant to start.</p>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
