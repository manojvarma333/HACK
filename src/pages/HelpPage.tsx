import { HelpCircle, Mic, MessageSquare, Volume2, Brain } from 'lucide-react';
import { PageContainer, PageHeader, Card, CardHeader, Badge } from '@/components/ui';

const faqs = [
  { q: 'How do I add stock with my voice?', a: 'Just say something like "Add 5 kg rice" or "5 kilo biyyam add cheyyi" (Telugu). The AI will detect the product, quantity, and action automatically.' },
  { q: 'What languages are supported?', a: 'VoiceStock AI understands English, Hindi, and Telugu. You can mix languages naturally — the AI will figure it out.' },
  { q: 'Can I correct a mistake?', a: 'Yes! If you said the wrong quantity, just say "No, make it 5 kg" and the AI will correct the previous entry.' },
  { q: 'When will the backend be available?', a: 'The full backend with Whisper speech-to-text, LLM intent understanding, and TTS responses is on the roadmap. This is the frontend preview.' },
];

export function HelpPage() {
  return (
    <PageContainer>
      <PageHeader title="Help & Support" subtitle="Learn how to get the most from VoiceStock AI" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><div className="flex items-center gap-3"><Mic className="w-8 h-8 text-primary-500" /><div><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Voice Commands</p><p className="text-xs text-gray-500">Add, remove, query stock</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><MessageSquare className="w-8 h-8 text-teal-500" /><div><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Multilingual</p><p className="text-xs text-gray-500">English, Hindi, Telugu</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><Volume2 className="w-8 h-8 text-warning-500" /><div><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Spoken Responses</p><p className="text-xs text-gray-500">AI talks back to you</p></div></div></Card>
        <Card><div className="flex items-center gap-3"><Brain className="w-8 h-8 text-success-500" /><div><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Insights</p><p className="text-xs text-gray-500">Predictions & automation</p></div></div></Card>
      </div>

      <Card>
        <CardHeader title="Frequently Asked Questions" subtitle="Quick answers to common questions" />
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-gray-100 dark:border-gray-800 last:border-0 pb-4 last:pb-0">
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{faq.q}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{faq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">Need more help?</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Our team is here to assist you with setup and onboarding.</p>
          </div>
          <Badge tone="primary">support@voicestock.ai</Badge>
        </div>
      </Card>
    </PageContainer>
  );
}
