import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AudioLines, Mail, Lock, User, Store, Loader2 } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';

export function SignupPage() {
  const { register, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', shop_name: '', password: '', confirm_password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && isAuthenticated) return <Navigate to="/" replace />;

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !form.shop_name.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-3">
            <AudioLines className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create your shop account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Start managing inventory with your voice</p>
        </div>

        <Card>
          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Your name"
              icon={<User className="w-4 h-4" />}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ravi Kumar"
            />
            <Input
              label="Shop name"
              icon={<Store className="w-4 h-4" />}
              value={form.shop_name}
              onChange={(e) => set('shop_name', e.target.value)}
              placeholder="Krishna Stores"
            />
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              icon={<Mail className="w-4 h-4" />}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="you@shop.com"
            />
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              icon={<Lock className="w-4 h-4" />}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="At least 6 characters"
            />
            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              icon={<Lock className="w-4 h-4" />}
              value={form.confirm_password}
              onChange={(e) => set('confirm_password', e.target.value)}
              placeholder="••••••••"
            />
            {error && <p className="text-sm text-error-500">{error}</p>}
            <Button type="submit" size="md" className="w-full justify-center" disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {busy ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
