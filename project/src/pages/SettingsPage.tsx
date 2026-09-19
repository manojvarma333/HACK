import { Settings as SettingsIcon, Sun, Moon, Volume2, Bell, Shield, Globe } from 'lucide-react';
import { PageContainer, PageHeader, Card, CardHeader, Button, Badge } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <PageContainer>
      <PageHeader title="Settings" subtitle="Manage your VoiceStock AI preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Appearance" subtitle="Customize your interface" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'light' ? <Sun className="w-5 h-5 text-warning-500" /> : <Moon className="w-5 h-5 text-primary-400" />}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Theme</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Currently: {theme}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                Switch to {theme === 'light' ? 'Dark' : 'Light'}
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Voice & Language" subtitle="Speech recognition preferences" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-teal-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Primary Language</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">English (with Hindi & Telugu support)</p>
                </div>
              </div>
              <Badge tone="primary">Multilingual</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-primary-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Spoken Responses</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">AI speaks responses aloud</p>
                </div>
              </div>
              <Badge tone="success">Enabled</Badge>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Notifications" subtitle="Alert preferences" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-warning-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Low Stock Alerts</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Notify when stock drops below minimum</p>
                </div>
              </div>
              <Badge tone="success">On</Badge>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Security" subtitle="Account & data protection" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-success-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Data Encryption</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">All data encrypted at rest</p>
                </div>
              </div>
              <Badge tone="success">Active</Badge>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="About VoiceStock AI" subtitle="Version 0.1.0 — Frontend Preview" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">VoiceStock AI — Frontend Shell</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Built with React + Vite + TypeScript + Tailwind CSS. Backend (FastAPI, Whisper, LLM, TTS) coming soon.</p>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
