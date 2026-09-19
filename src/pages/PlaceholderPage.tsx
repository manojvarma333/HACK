import { type ReactNode } from 'react';
import { Construction } from 'lucide-react';
import { PageContainer, PageHeader, Card, Badge } from '@/components/ui';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: ReactNode;
  features?: string[];
}

export function PlaceholderPage({ title, description, icon, features }: PlaceholderPageProps) {
  return (
    <PageContainer>
      <PageHeader title={title} subtitle={description} />
      <Card className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-50 to-teal-50 dark:from-primary-500/10 dark:to-teal-500/10 flex items-center justify-center mb-6 text-primary-600 dark:text-primary-400">
          {icon}
        </div>
        <Badge tone="warning"><Construction className="w-3 h-3" /> Coming Soon</Badge>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-4">
          {title} is being built
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md">
          This section is part of the VoiceStock AI roadmap. The frontend shell is ready — backend integration with FastAPI, Whisper, and LLM will follow.
        </p>
        {features && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 max-w-lg w-full">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-left">
                <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-300">{f}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
