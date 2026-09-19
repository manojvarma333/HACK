import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, type VoiceStatus } from '@/services/api';

/**
 * App mode (PRD 8): Simulation vs Real. Simulation never breaks the app even
 * when AI services are unavailable; Real Mode uses the backend microphone,
 * Whisper and configured NLU. Persisted to localStorage.
 */
export type AppMode = 'simulation' | 'real';

interface ModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
  status: VoiceStatus | null;
  online: boolean;
}

const ModeContext = createContext<ModeContextValue | undefined>(undefined);
const STORAGE_KEY = 'voicestock_mode';

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>(
    () => (localStorage.getItem(STORAGE_KEY) as AppMode) || 'simulation',
  );
  const [status, setStatus] = useState<VoiceStatus | null>(null);
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  const setMode = useCallback((next: AppMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleMode = useCallback(
    () => setMode(mode === 'real' ? 'simulation' : 'real'),
    [mode, setMode],
  );

  useEffect(() => {
    let active = true;
    api.voice
      .status()
      .then((s) => active && setStatus(s))
      .catch(() => active && setStatus(null));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const value = useMemo(
    () => ({ mode, setMode, toggleMode, status, online }),
    [mode, setMode, toggleMode, status, online],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within a ModeProvider');
  return ctx;
}
