import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, IndianRupee, TrendingUp, Mic, AlertTriangle,
  ArrowUpRight, BrainCircuit, ChevronRight,
} from 'lucide-react';
import { PageContainer, PageHeader, Card, CardHeader, StatCard, Badge, Button, Progress } from '@/components/ui';
import { useData } from '@/context/DataContext';
import { formatCurrency, formatRelativeTime } from '@/utils/format';
import { salesByDay, salesByProduct, stockLevel, totalStockValue } from '@/utils/analytics';

export function DashboardPage() {
  const { products, transactions, voiceHistory, loading } = useData();

  const stockValue = useMemo(() => totalStockValue(products), [products]);
  const lowStock = useMemo(
    () => products.filter((p) => stockLevel(p) !== 'ok'),
    [products],
  );
  const criticalAlerts = useMemo(
    () => products.filter((p) => p.current_stock < 3),
    [products],
  );
  const week = useMemo(() => salesByDay(transactions, products), [transactions, products]);
  const todaySales = week.length ? week[week.length - 1].sales : 0;
  const sales = useMemo(() => salesByProduct(transactions, products), [transactions, products]);
  const topProduct = sales[0];

  const lowestStock = useMemo(
    () =>
      [...products]
        .sort((a, b) => a.current_stock / (a.min_stock || 1) - b.current_stock / (b.min_stock || 1))
        .slice(0, 5),
    [products],
  );

  // Dynamic insight: product closest to running out by days of cover.
  const insight = useMemo(() => {
    const withCover = products
      .filter((p) => p.avg_daily_usage > 0)
      .map((p) => ({ p, days: p.current_stock / p.avg_daily_usage }))
      .sort((a, b) => a.days - b.days);
    return withCover[0] ?? null;
  }, [products]);

  const todayVoice = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return voiceHistory.filter((v) => v.created_at.slice(0, 10) === today).length;
  }, [voiceHistory]);

  if (loading && products.length === 0) {
    return (
      <PageContainer>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />)}
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        subtitle="Your store at a glance — updated live"
        action={
          <Link to="/voice">
            <Button size="md"><Mic className="w-4 h-4" /> Voice Command</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Stock Value" value={formatCurrency(stockValue)} icon={<IndianRupee className="w-5 h-5" />} tone="primary" />
        <StatCard label="Today's Sales" value={formatCurrency(todaySales)} icon={<TrendingUp className="w-5 h-5" />} tone="success" />
        <StatCard label="Products" value={String(products.length)} icon={<Package className="w-5 h-5" />} tone="teal" />
        <StatCard label="Low Stock Alerts" value={String(lowStock.length)} icon={<AlertTriangle className="w-5 h-5" />} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Sales This Week" subtitle="Daily revenue from voice & manual sales" />
          <div className="flex items-end justify-between gap-2 h-48">
            {week.map((d) => {
              const max = Math.max(...week.map((s) => s.sales), 1);
              const h = (d.sales / max) * 100;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-primary-600 to-primary-400 hover:from-primary-700 hover:to-primary-500 transition-all group relative"
                      style={{ height: `${Math.max(h, 2)}%` }}
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatCurrency(d.sales)}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{d.label}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent Voice Commands" subtitle={`${todayVoice} today`} action={<Link to="/voice-history"><ChevronRight className="w-4 h-4 text-gray-400" /></Link>} />
          <div className="space-y-3">
            {voiceHistory.slice(0, 4).map((v) => (
              <div key={v.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">"{v.transcript}"</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{v.response ?? v.status}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{formatRelativeTime(v.created_at)}</span>
              </div>
            ))}
            {voiceHistory.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No voice commands yet. Try the Voice Assistant.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Stock Overview" subtitle="Lowest stock levels first" action={<Link to="/inventory"><ChevronRight className="w-4 h-4 text-gray-400" /></Link>} />
          <div className="space-y-4">
            {lowestStock.map((p) => {
              const level = stockLevel(p);
              const pct = Math.min(100, (p.current_stock / (p.min_stock * 3 || 1)) * 100);
              return (
                <div key={p.id} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">{p.current_stock} {p.base_unit}</span>
                    </div>
                    <Progress value={pct} tone={level === 'out' || level === 'critical' ? 'error' : level === 'low' ? 'warning' : 'success'} />
                  </div>
                  <Badge tone={level === 'out' || level === 'critical' ? 'error' : level === 'low' ? 'warning' : 'success'}>
                    {level === 'out' ? 'Out' : level === 'critical' ? 'Critical' : level === 'low' ? 'Low' : 'OK'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Active Alerts" subtitle="Stock below 3 units" action={<Link to="/alerts"><ChevronRight className="w-4 h-4 text-gray-400" /></Link>} />
          <div className="space-y-3">
            {criticalAlerts.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-error-100 text-error-600 dark:bg-error-500/15 dark:text-error-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Only {p.current_stock} {p.base_unit} left</p>
                </div>
              </div>
            ))}
            {criticalAlerts.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">All products are sufficiently stocked.</p>
            )}
          </div>
        </Card>
      </div>

      {insight && (
        <Card className="mt-6 bg-gradient-to-br from-primary-600 to-primary-800 border-0 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-lg">AI Insight</p>
                <p className="text-sm text-white/80">
                  {insight.p.name} will run out in about {Math.max(0, Math.round(insight.days))} day
                  {Math.round(insight.days) === 1 ? '' : 's'} at current usage
                  {topProduct && topProduct.unitsSold > 0 ? `. Top seller: ${topProduct.name}.` : '.'} Consider reordering.
                </p>
              </div>
            </div>
            <Link to="/purchases">
              <Button variant="secondary" className="bg-white text-primary-700 hover:bg-white/90">
                Create Order <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
