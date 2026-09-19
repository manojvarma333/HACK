import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/hooks/useTheme';
import { ModeProvider } from '@/context/ModeContext';
import { AppLayout } from '@/components/layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { VoiceAssistantPage } from '@/pages/VoiceAssistantPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { AIActivityPage } from '@/pages/AIActivityPage';
import { VoiceHistoryPage } from '@/pages/VoiceHistoryPage';
import { SuppliersPage } from '@/pages/SuppliersPage';
import { PurchasesPage } from '@/pages/PurchasesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { HelpPage } from '@/pages/HelpPage';

function App() {
  return (
    <ThemeProvider>
      <ModeProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="voice" element={<VoiceAssistantPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="ai-activity" element={<AIActivityPage />} />
              <Route path="voice-history" element={<VoiceHistoryPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="purchases" element={<PurchasesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="help" element={<HelpPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ModeProvider>
    </ThemeProvider>
  );
}

export default App;
