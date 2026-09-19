import { BrainCircuit } from 'lucide-react';
import { PlaceholderPage } from './PlaceholderPage';

export function AIActivityPage() {
  return (
    <PlaceholderPage
      title="AI Activity"
      description="Voice commands, predictions, and automations"
      icon={<BrainCircuit className="w-8 h-8" />}
      features={['Voice command log with transcripts', 'AI predictions & insights', 'Automated actions timeline', 'Model confidence metrics']}
    />
  );
}
