import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, IndianRupee, TrendingUp, Mic, AlertTriangle,
  ArrowUpRight, ArrowDownRight, BrainCircuit, ChevronRight,
} from 'lucide-react';
import { PageContainer, PageHeader, Card, CardHeader, StatCard, Badge, Button, Progress } from '@/components/ui';
import { mockService } from '@/services/mockService';
import { formatCurrency, formatRelativeTime, getStockStatus } from '@/utils/format';
import type { DashboardStats, Product, Alert, VoiceInteraction } from '@/types';

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentVoice, setRecentVoice] = useState<VoiceInteraction[]>([]);

  useEffect(() => {
    mockService.getDashboardStats().then(setStats);
    mockService.getProducts().then((p) => setProducts([...p].sort((a, b) => a.stock / a.minStock - b.stock / b.minStock).slice(0, 5)));
    mockService.getAlerts().then(setAlerts);
    mockService.getVoiceInteractions().then((v) => setRecentVoice(v.slice(0, 4)));
  }, []);

  if (!stats) {
    return <PageContainer><div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" /><div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}</div></div></PageContainer>;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back, Ravi — here's your store at a glance"
        action={<Button size="md"><Mic className="w-4 h-4" /> Voice Command</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Stock Value" value={formatCurrency(stats.totalStockValue)} icon={<IndianRupee className="w-5 h-5" />} trend={{ value: '4.2%', up: false }} tone="primary" />
        <StatCard label="Today's Sales" value={formatCurrency(stats.todaySales)} icon={<TrendingUp className="w-5 h-5" />} trend={{ value: '12%', up: true }} tone="success" />
        <StatCard label="Products" value={String(stats.totalProducts)} icon={<Package className="w-5 h-5" />} tone="teal" />
        <StatCard label="Low Stock Alerts" value={String(stats.lowStockCount)} icon={<AlertTriangle className="w-5 h-5" />} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Sales This Week" subtitle="Daily revenue trend" />
          <div className="flex items-end justify-between gap-2 h-48">
            {stats.salesTrend.map((d) => {
              const max = Math.max(...stats.salesTrend.map((s) => s.sales));
              const h = (d.sales / max) * 100;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400 hover:from-primary-700 hover:to-primary-500 transition-all group relative"
                      style={{ height: `${h}%` }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatCurrency(d.sales)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{d.day}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent Voice Commands" subtitle="AI-processed" action={<Link to="/voice-history"><ChevronRight className="w-4 h-4 text-gray-400" /></Link>} />
          <div className="space-y-3">
            {recentVoice.map((v) => (
              <div key={v.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">"{v.transcript}"</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{v.action}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{formatRelativeTime(v.timestamp)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Stock Overview" subtitle="Lowest stock levels first" action={<Link to="/inventory"><ChevronRight className="w-4 h-4 text-gray-400" /></Link>} />
          <div className="space-y-4">
            {products.map((p) => {
              const status = getStockStatus(p.stock, p.minStock);
              const pct = Math.min(100, (p.stock / (p.minStock * 3)) * 100);
              return (
                <div key={p.id} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">{p.stock} {p.unit}</span>
                    </div>
                    <Progress
                      value={pct}
                      tone={status === 'out' ? 'error' : status === 'low' ? 'warning' : 'success'}
                    />
                  </div>
                  <Badge tone={status === 'out' ? 'error' : status === 'low' ? 'warning' : 'success'}>
                    {status === 'out' ? 'Out' : status === 'low' ? 'Low' : 'OK'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Active Alerts" action={<Link to="/alerts"><ChevronRight className="w-4 h-4 text-gray-400" /></Link>} />
          <div className="space-y-3">
            {alerts.slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  a.severity === 'critical' ? 'bg-error-100 text-error-600 dark:bg-error-500/15 dark:text-error-400' :
                  a.severity === 'warning' ? 'bg-warning-100 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400' :
                  'bg-primary-100 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400'
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.productName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6 bg-gradient-to-br from-primary-600 to-primary-800 border-0 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-lg">AI Insight</p>
              <p className="text-sm text-white/80">Wheat Flour will run out in 2 days based on current sales velocity. Consider reordering from Sharma Distributors.</p>
            </div>
          </div>
          <Button variant="secondary" className="bg-white text-primary-700 hover:bg-white/90">
            Create Order <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </PageContainer>
  );
}
