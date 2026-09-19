import { History } from 'lucide-react';
import { PlaceholderPage } from './PlaceholderPage';

export function VoiceHistoryPage() {
  return (
    <PlaceholderPage
      title="Voice History"
      description="Complete log of all voice interactions"
      icon={<History className="w-8 h-8" />}
      features={['Searchable transcript history', 'Language & intent filters', 'Confidence scoring', 'Replay audio (future)']}
    />
  );
}
