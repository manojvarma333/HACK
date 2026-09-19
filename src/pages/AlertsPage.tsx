import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, ShoppingCart, PackageX } from 'lucide-react';
import { PageContainer, PageHeader, Card, Badge, Button } from '@/components/ui';
import { useData } from '@/context/DataContext';

const THRESHOLD = 3;

export function AlertsPage() {
  const { products } = useData();

  const alerts = useMemo(
    () =>
      products
        .filter((p) => p.current_stock < THRESHOLD)
        .sort((a, b) => a.current_stock - b.current_stock),
    [products],
  );

  const outOfStock = alerts.filter((p) => p.current_stock <= 0);
  const low = alerts.filter((p) => p.current_stock > 0);

  return (
    <PageContainer>
      <PageHeader
        title="Alerts"
        subtitle={`Products with fewer than ${THRESHOLD} units in stock`}
        action={
          <Link to="/purchases">
            <Button size="md"><ShoppingCart className="w-4 h-4" /> Order Stock</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400 flex items-center justify-center">
              <PackageX className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{outOfStock.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Out of stock</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{low.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Critically low (&lt; {THRESHOLD})</p>
            </div>
          </div>
        </Card>
      </div>

      <Card padding={false} className="overflow-hidden">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {alerts.map((p) => {
            const out = p.current_stock <= 0;
            return (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  out ? 'bg-error-100 text-error-600 dark:bg-error-500/15 dark:text-error-400'
                      : 'bg-warning-100 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {out ? 'Out of stock' : `Only ${p.current_stock} ${p.base_unit} left`} · {p.category}
                  </p>
                </div>
                <Badge tone={out ? 'error' : 'warning'}>{p.current_stock} {p.base_unit}</Badge>
              </div>
            );
          })}
        </div>
        {alerts.length === 0 && (
          <div className="py-16 text-center">
            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No low-stock alerts. Everything is well stocked.</p>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
