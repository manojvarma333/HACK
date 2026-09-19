import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/hooks/useTheme';
import { ModeProvider } from '@/context/ModeContext';
import { AuthProvider } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';
import { AppLayout, ProtectedRoute } from '@/components/layout';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
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
      <AuthProvider>
        <ModeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="login" element={<LoginPage />} />
              <Route path="signup" element={<SignupPage />} />
              <Route element={<ProtectedRoute />}>
                <Route
                  element={(
                    <DataProvider>
                      <AppLayout />
                    </DataProvider>
                  )}
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="voice" element={<VoiceAssistantPage />} />
                  <Route path="inventory" element={<InventoryPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="alerts" element={<AlertsPage />} />
                  <Route path="voice-history" element={<VoiceHistoryPage />} />
                  <Route path="purchases" element={<PurchasesPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </ModeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
