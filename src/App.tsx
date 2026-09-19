import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/hooks/useTheme';
import { ModeProvider } from '@/context/ModeContext';
import { DataProvider } from '@/context/DataContext';
import { AppLayout } from '@/components/layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { VoiceAssistantPage } from '@/pages/VoiceAssistantPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { VoiceHistoryPage } from '@/pages/VoiceHistoryPage';
import { PurchasesPage } from '@/pages/PurchasesPage';
import { SettingsPage } from '@/pages/SettingsPage';

function App() {
  return (
    <ThemeProvider>
      <ModeProvider>
        <DataProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="voice" element={<VoiceAssistantPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="voice-history" element={<VoiceHistoryPage />} />
                <Route path="purchases" element={<PurchasesPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </DataProvider>
      </ModeProvider>
    </ThemeProvider>
  );
}

export default App;
