import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AudioLines, Mail, Lock, Loader2 } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';

export function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && isAuthenticated) {
    const from = (location.state as { from?: string })?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-3">
            <AudioLines className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">VoiceStock AI</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to your shop</p>
        </div>

        <Card>
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@shop.com"
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {error && <p className="text-sm text-error-500">{error}</p>}
            <Button type="submit" size="md" className="w-full justify-center" disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {busy ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
