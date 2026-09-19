import { useMemo, useState } from 'react';
import { Package, Search, Plus, Filter, Download, X, ArrowUp, ArrowDown } from 'lucide-react';
import { PageContainer, PageHeader, Card, Badge, Button, Input, Progress } from '@/components/ui';
import { useData } from '@/context/DataContext';
import { api, ApiError, type ApiProduct, type NewProductInput } from '@/services/api';
import { formatCurrency, classNames } from '@/utils/format';
import { stockLevel } from '@/utils/analytics';

type StockOp = { product: ApiProduct; mode: 'add' | 'remove' };

const badgeTone = (p: ApiProduct) => {
  const level = stockLevel(p);
  return level === 'out' || level === 'critical' ? 'error' : level === 'low' ? 'warning' : 'success';
};
const statusLabel = (p: ApiProduct) => {
  const level = stockLevel(p);
  return level === 'out' ? 'Out of stock' : level === 'critical' ? 'Critical' : level === 'low' ? 'Low stock' : 'In stock';
};

export function InventoryPage() {
  const { products, refresh } = useData();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [stockOp, setStockOp] = useState<StockOp | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const notify = (text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 2600);
  };

  const categories = useMemo(() => ['All', ...new Set(products.map((p) => p.category))], [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = query.toLowerCase();
      const matchesQuery =
        p.name.toLowerCase().includes(q) ||
        (p.name_local ?? '').includes(query) ||
        p.category.toLowerCase().includes(q);
      const matchesCategory = category === 'All' || p.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, category]);

  const exportCsv = () => {
    const header = ['Name', 'Category', 'Stock', 'Unit', 'Min', 'Purchase Price', 'Selling Price', 'Stock Value'];
    const rows = filtered.map((p) => [
      p.name, p.category, p.current_stock, p.base_unit, p.min_stock,
      p.purchase_price, p.selling_price, (p.current_stock * p.purchase_price).toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Inventory"
        subtitle={`${products.length} products across ${categories.length - 1} categories · live`}
        action={
          <>
            <Button variant="outline" size="md" onClick={exportCsv}><Download className="w-4 h-4" /> Export</Button>
            <Button size="md" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Product</Button>
          </>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input placeholder="Search products..." value={query} onChange={(e) => setQuery(e.target.value)} icon={<Search className="w-4 h-4" />} />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={classNames(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                category === c ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
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
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Value</th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((p) => {
                const stockPct = Math.min(100, (p.current_stock / (p.min_stock * 3 || 1)) * 100);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-500/15 dark:to-teal-500/15 flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                          {p.name_local && <p className="text-xs text-gray-400 dark:text-gray-500">{p.name_local}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{p.category}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{p.current_stock} {p.base_unit}</p>
                      <p className="text-xs text-gray-400">min: {p.min_stock}</p>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="w-24">
                        <Progress value={stockPct} tone={badgeTone(p)} />
                        <Badge tone={badgeTone(p)} className="mt-1.5">{statusLabel(p)}</Badge>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right hidden lg:table-cell">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(p.current_stock * p.purchase_price)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => setStockOp({ product: p, mode: 'add' })}>
                          <ArrowUp className="w-3.5 h-3.5" /> Add
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setStockOp({ product: p, mode: 'remove' })}>
                          <ArrowDown className="w-3.5 h-3.5" /> Remove
                        </Button>
                      </div>
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

      {stockOp && (
        <StockOpModal
          op={stockOp}
          onClose={() => setStockOp(null)}
          onDone={async (msg, error) => {
            setStockOp(null);
            if (!error) await refresh();
            notify(msg, error);
          }}
        />
      )}

      {showAdd && (
        <AddProductModal
          onClose={() => setShowAdd(false)}
          onDone={async (msg, error) => {
            setShowAdd(false);
            if (!error) await refresh();
            notify(msg, error);
          }}
        />
      )}

      {toast && (
        <div className={classNames(
          'fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm text-white',
          toast.error ? 'bg-error-600' : 'bg-success-600',
        )}>
          {toast.text}
        </div>
      )}
    </PageContainer>
  );
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function StockOpModal({ op, onClose, onDone }: {
  op: StockOp;
  onClose: () => void;
  onDone: (msg: string, error?: boolean) => void;
}) {
  const { product, mode } = op;
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState(product.default_unit);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      onDone('Enter a valid quantity.', true);
      return;
    }
    setBusy(true);
    try {
      if (mode === 'add') await api.inventory.add(product.id, qty, unit, 'Manual add');
      else await api.inventory.remove(product.id, qty, unit, 'Manual remove');
      onDone(`${mode === 'add' ? 'Added' : 'Removed'} ${qty} ${unit} ${mode === 'add' ? 'to' : 'from'} ${product.name}.`);
    } catch (err) {
      onDone(err instanceof ApiError ? err.message : 'Operation failed.', true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title={`${mode === 'add' ? 'Add stock' : 'Remove stock'} — ${product.name}`} onClose={onClose}>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Current: {product.current_stock} {product.base_unit}</p>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Quantity" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <Input label="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={mode === 'add' ? 'primary' : 'danger'} onClick={submit} disabled={busy}>
          {busy ? 'Saving...' : mode === 'add' ? 'Add stock' : 'Remove stock'}
        </Button>
      </div>
    </ModalShell>
  );
}

function AddProductModal({ onClose, onDone }: {
  onClose: () => void;
  onDone: (msg: string, error?: boolean) => void;
}) {
  const [form, setForm] = useState<NewProductInput>({
    name: '', name_local: '', category: '', base_unit: 'kg', default_unit: 'kg',
    opening_stock: 0, min_stock: 0, critical_stock: 0, purchase_price: 0, selling_price: 0,
  });
  const [busy, setBusy] = useState(false);
  const [aliasText, setAliasText] = useState('');
  const set = (k: keyof NewProductInput, v: string) =>
    setForm((f) => ({ ...f, [k]: ['name', 'name_local', 'category', 'base_unit', 'default_unit'].includes(k) ? v : Number(v) }));

  const submit = async () => {
    if (!form.name.trim() || !form.category.trim()) {
      onDone('Name and category are required.', true);
      return;
    }
    setBusy(true);
    try {
      // Aliases = user-entered spoken names + the local name, so the voice
      // assistant can resolve this product in any language from now on.
      const aliases = Array.from(
        new Set(
          [...aliasText.split(','), form.name_local ?? '']
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      );
      await api.products.create({ ...form, default_unit: form.base_unit, aliases });
      onDone(`Added product "${form.name}".`);
    } catch (err) {
      onDone(err instanceof ApiError ? err.message : 'Could not create product.', true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell title="Add product" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} />
        <Input label="Local name" value={form.name_local} onChange={(e) => set('name_local', e.target.value)} />
        <Input label="Category" value={form.category} onChange={(e) => set('category', e.target.value)} />
        <Input label="Unit (kg/litre/packet)" value={form.base_unit} onChange={(e) => set('base_unit', e.target.value)} />
        <Input label="Opening stock" type="number" value={String(form.opening_stock)} onChange={(e) => set('opening_stock', e.target.value)} />
        <Input label="Min stock" type="number" value={String(form.min_stock)} onChange={(e) => set('min_stock', e.target.value)} />
        <Input label="Critical stock" type="number" value={String(form.critical_stock)} onChange={(e) => set('critical_stock', e.target.value)} />
        <Input label="Purchase price" type="number" value={String(form.purchase_price)} onChange={(e) => set('purchase_price', e.target.value)} />
        <Input label="Selling price" type="number" value={String(form.selling_price)} onChange={(e) => set('selling_price', e.target.value)} />
      </div>
      <div className="mt-3">
        <Input
          label="Other names for voice (comma separated — Hindi / Telugu / nicknames)"
          placeholder="e.g. चावल, బియ్యం, chawal"
          value={aliasText}
          onChange={(e) => setAliasText(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={busy}>{busy ? 'Saving...' : 'Add product'}</Button>
      </div>
    </ModalShell>
  );
}
