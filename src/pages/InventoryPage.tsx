import { useEffect, useState, useMemo } from 'react';
import { Package, Search, Plus, Filter, Download } from 'lucide-react';
import { PageContainer, PageHeader, Card, Badge, Button, Input, Progress } from '@/components/ui';
import { mockService } from '@/services/mockService';
import { formatCurrency, getStockStatus, classNames } from '@/utils/format';
import type { Product } from '@/types';

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    mockService.getProducts().then(setProducts);
  }, []);

  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category))], [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesQuery =
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.nameLocal?.includes(query) ||
        p.category.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === 'All' || p.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, category]);

  return (
    <PageContainer>
      <PageHeader
        title="Inventory"
        subtitle={`${products.length} products across ${categories.length - 1} categories`}
        action={
          <>
            <Button variant="outline" size="md"><Download className="w-4 h-4" /> Export</Button>
            <Button size="md"><Plus className="w-4 h-4" /> Add Product</Button>
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={classNames(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                category === c
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <Card padding={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Product</th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Category</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Stock</th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Status</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Price</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((p) => {
                const status = getStockStatus(p.stock, p.minStock);
                const stockPct = Math.min(100, (p.stock / (p.minStock * 3)) * 100);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-500/15 dark:to-teal-500/15 flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                          {p.nameLocal && <p className="text-xs text-gray-400 dark:text-gray-500">{p.nameLocal}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{p.category}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{p.stock} {p.unit}</p>
                      <p className="text-xs text-gray-400">min: {p.minStock}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="w-24">
                        <Progress
                          value={stockPct}
                          tone={status === 'out' ? 'error' : status === 'low' ? 'warning' : 'success'}
                        />
                        <Badge tone={status === 'out' ? 'error' : status === 'low' ? 'warning' : 'success'} className="mt-1.5">
                          {status === 'out' ? 'Out of stock' : status === 'low' ? 'Low stock' : 'In stock'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right hidden lg:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{formatCurrency(p.price)}</span>
                    </td>
                    <td className="px-5 py-4 text-right hidden lg:table-cell">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(p.stock * p.cost)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No products found</p>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
