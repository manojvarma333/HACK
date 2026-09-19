/**
 * Backend API client for VoiceStock AI.
 *
 * All real-mode data flows through here. Uses fetch (no extra deps). The auth
 * token, when present, is read from localStorage and sent as a Bearer header.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
const TOKEN_KEY = 'voicestock_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }

  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    try {
      const data = await res.json();
      const detail = data?.detail ?? data?.error;
      if (typeof detail === 'string') message = detail;
      else if (detail?.message) {
        message = detail.message;
        code = detail.code;
      }
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(message, res.status, code);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --------------------------- Types ---------------------------
export interface PipelineStage {
  stage: string;
  status: 'ok' | 'skipped' | 'error' | 'pending';
  detail?: string | null;
  duration_ms?: number | null;
}

export interface ResolvedProduct {
  id: string;
  name: string;
  score: number;
}

export interface TTSResult {
  text: string;
  lang: string;
  provider: string;
  audio_base64?: string | null;
}

export interface VoiceProcessResponse {
  session_id: string;
  state:
    | 'CONFIRMATION'
    | 'CLARIFY'
    | 'QUERY'
    | 'EXECUTED'
    | 'CANCELLED'
    | 'ERROR'
    | 'UNKNOWN';
  intent: string;
  nlu: {
    intent: string;
    item?: string | null;
    quantity?: number | null;
    unit?: string | null;
    target_stock?: number | null;
    confidence: number;
  };
  language?: string | null;
  product?: ResolvedProduct | null;
  candidates: ResolvedProduct[];
  normalized_quantity?: number | null;
  base_unit?: string | null;
  requires_confirmation: boolean;
  response_text: string;
  tts?: TTSResult | null;
  pipeline: PipelineStage[];
}

export interface ApiProduct {
  id: string;
  name: string;
  name_local?: string | null;
  category: string;
  base_unit: string;
  default_unit: string;
  current_stock: number;
  min_stock: number;
  critical_stock: number;
  purchase_price: number;
  selling_price: number;
  avg_daily_usage: number;
  status: string;
  stock_value: number;
  days_of_cover?: number | null;
  updated_at: string;
}

export interface ApiTransaction {
  id: string;
  product_id: string;
  action: string;
  quantity: number;
  unit: string;
  normalized_quantity: number;
  stock_after: number;
  reason?: string | null;
  source: string;
  created_at: string;
}

export interface VoiceStatus {
  whisper_available: boolean;
  gemini_available: boolean;
  default_mode: string;
}

// --------------------------- API ---------------------------
export const api = {
  health: () => request<{ status: string }>('/api/health'),

  voice: {
    status: () => request<VoiceStatus>('/api/voice/status'),
    process: (transcript: string, mode: string, sessionId?: string | null, language?: string) =>
      request<VoiceProcessResponse>('/api/voice/process', {
        method: 'POST',
        body: JSON.stringify({ transcript, mode, session_id: sessionId ?? null, ...(language && { language }) }),
      }),
    confirm: (sessionId: string, answer: string, mode: string) =>
      request<VoiceProcessResponse>('/api/voice/confirm', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, answer, mode }),
      }),
    cancel: (sessionId: string, mode: string) =>
      request<VoiceProcessResponse>('/api/voice/cancel', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, answer: 'cancel', mode }),
      }),
    transcribe: (audio: Blob, mode = 'real', language?: string) => {
      const form = new FormData();
      form.append('audio', audio, 'recording.webm');
      form.append('mode', mode);
      if (language) form.append('language', language);
      return request<{ transcript: string; language?: string | null; backend: string }>(
        '/api/voice/transcribe',
        { method: 'POST', body: form },
      );
    },
    history: (limit = 50) =>
      request<
        Array<{
          id: string;
          transcript: string;
          intent?: string | null;
          product_name?: string | null;
          quantity?: number | null;
          unit?: string | null;
          confidence?: number | null;
          language?: string | null;
          status: string;
          response?: string | null;
          created_at: string;
        }>
      >(`/api/voice/history?limit=${limit}`),
  },

  products: {
    list: (params?: { search?: string; category?: string; status?: string }) => {
      const q = new URLSearchParams(
        Object.entries(params ?? {}).filter(([, v]) => v) as [string, string][],
      ).toString();
      return request<ApiProduct[]>(`/api/products${q ? `?${q}` : ''}`);
    },
    get: (id: string) => request<ApiProduct>(`/api/products/${id}`),
  },

  inventory: {
    list: () => request<ApiProduct[]>('/api/inventory'),
    add: (productId: string, quantity: number, unit?: string, reason?: string) =>
      request<ApiTransaction>('/api/inventory/add', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity, unit, reason, source: 'MANUAL' }),
      }),
    remove: (productId: string, quantity: number, unit?: string, reason?: string) =>
      request<ApiTransaction>('/api/inventory/remove', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity, unit, reason, source: 'MANUAL' }),
      }),
    correct: (productId: string, targetStock: number, unit?: string, reason?: string) =>
      request<ApiTransaction>('/api/inventory/correct', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, target_stock: targetStock, unit, reason, source: 'MANUAL' }),
      }),
  },

  transactions: {
    list: (limit = 100) => request<ApiTransaction[]>(`/api/transactions?limit=${limit}`),
  },

  auth: {
    login: (email: string, password: string) =>
      request<{ access_token: string; user: unknown }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (payload: {
      name: string;
      email: string;
      password: string;
      confirm_password: string;
      shop_name: string;
    }) =>
      request<{ access_token: string; user: unknown }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    me: () => request<{ id: string; name: string; email: string; shop_name: string }>('/api/auth/me'),
  },
};
