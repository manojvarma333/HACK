import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  type ApiProduct,
  type ApiTransaction,
  type ApiVoiceHistory,
} from '@/services/api';

interface DataState {
  products: ApiProduct[];
  transactions: ApiTransaction[];
  voiceHistory: ApiVoiceHistory[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataState | null>(null);

const POLL_MS = 5000;

export function DataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [voiceHistory, setVoiceHistory] = useState<ApiVoiceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const [prods, txns, history] = await Promise.all([
        api.inventory.list(),
        api.transactions.list(200),
        api.voice.history(100).catch(() => [] as ApiVoiceHistory[]),
      ]);
      if (!mounted.current) return;
      setProducts(prods);
      setTransactions(txns);
      setVoiceHistory(history as ApiVoiceHistory[]);
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const id = window.setInterval(refresh, POLL_MS);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
    };
  }, [refresh]);

  return (
    <DataContext.Provider
      value={{ products, transactions, voiceHistory, loading, error, refresh }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
