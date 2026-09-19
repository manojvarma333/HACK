import { useMemo } from 'react';
import { TrendingUp, TrendingDown, IndianRupee, BarChart3, PackageX } from 'lucide-react';
import { PageContainer, PageHeader, Card, CardHeader, StatCard, Badge } from '@/components/ui';
import { useData } from '@/context/DataContext';
import { formatCurrency } from '@/utils/format';
import { salesByProduct, type ProductSales } from '@/utils/analytics';

function BarRow({ item, max, tone }: { item: ProductSales; max: number; tone: 'primary' | 'error' }) {
  const pct = max > 0 ? (item.unitsSold / max) * 100 : 0;
  const color = tone === 'primary'
    ? 'from-primary-600 to-primary-400'
    : 'from-error-500 to-error-400';
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-sm text-gray-700 dark:text-gray-300 truncate flex-shrink-0">{item.name}</span>
      <div className="flex-1 h-6 rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-md bg-gradient-to-r ${color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className="w-24 text-right text-sm font-medium text-gray-900 dark:text-gray-100 flex-shrink-0">
        {item.unitsSold} {item.unit}
      </span>
    </div>
  );
}

export function AnalyticsPage() {
  const { products, transactions } = useData();
  const sales = useMemo(() => salesByProduct(transactions, products), [transactions, products]);

  const sold = useMemo(() => sales.filter((s) => s.unitsSold > 0), [sales]);
  const topSelling = sold.slice(0, 7);
  const leastSelling = useMemo(
    () => [...sold].sort((a, b) => a.unitsSold - b.unitsSold).slice(0, 7),
    [sold],
  );
  const neverSold = useMemo(() => sales.filter((s) => s.unitsSold === 0), [sales]);

  const totalRevenue = sales.reduce((s, p) => s + p.revenue, 0);
  const totalUnits = sales.reduce((s, p) => s + p.unitsSold, 0);
  const maxTop = Math.max(...topSelling.map((s) => s.unitsSold), 1);
  const maxLeast = Math.max(...leastSelling.map((s) => s.unitsSold), 1);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      const s = sales.find((x) => x.productId === p.id);
      map.set(p.category, (map.get(p.category) ?? 0) + (s?.revenue ?? 0));
    }
    return [...map.entries()].map(([category, revenue]) => ({ category, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [products, sales]);
  const maxCat = Math.max(...byCategory.map((c) => c.revenue), 1);

  return (
    <PageContainer>
      <PageHeader title="Analytics" subtitle="Sales performance from your transaction ledger" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={<IndianRupee className="w-5 h-5" />} tone="success" />
        <StatCard label="Units Sold" value={String(Math.round(totalUnits))} icon={<BarChart3 className="w-5 h-5" />} tone="primary" />
        <StatCard label="Best Seller" value={topSelling[0]?.name ?? '—'} icon={<TrendingUp className="w-5 h-5" />} tone="teal" />
        <StatCard label="Slow Movers" value={String(neverSold.length)} icon={<PackageX className="w-5 h-5" />} tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader title="Top Selling Products" subtitle="By units sold" />
          <div className="space-y-3">
            {topSelling.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No sales recorded yet.</p>}
            {topSelling.map((item) => <BarRow key={item.productId} item={item} max={maxTop} tone="primary" />)}
          </div>
        </Card>

        <Card>
          <CardHeader title="Least Selling Products" subtitle="Lowest movers — watch for dead stock" />
          <div className="space-y-3">
            {leastSelling.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">No sales recorded yet.</p>}
            {leastSelling.map((item) => <BarRow key={item.productId} item={item} max={maxLeast} tone="error" />)}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue by Category" />
          <div className="space-y-3">
            {byCategory.map((c) => {
              const pct = (c.revenue / maxCat) * 100;
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-gray-700 dark:text-gray-300 truncate flex-shrink-0">{c.category}</span>
                  <div className="flex-1 h-6 rounded-md bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className="h-full rounded-md bg-gradient-to-r from-teal-500 to-teal-400" style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                  <span className="w-24 text-right text-sm font-medium text-gray-900 dark:text-gray-100 flex-shrink-0">{formatCurrency(c.revenue)}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Never Sold" subtitle="Consider promotions" />
          <div className="space-y-2">
            {neverSold.slice(0, 8).map((p) => (
              <div key={p.productId} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{p.name}</span>
                <Badge tone="warning"><TrendingDown className="w-3 h-3" /> 0 sold</Badge>
              </div>
            ))}
            {neverSold.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Every product has sold at least once.</p>}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
