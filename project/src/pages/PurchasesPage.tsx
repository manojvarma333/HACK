import { useEffect, useMemo, useState } from 'react';
import {
  Truck, ShoppingCart, Search, Plus, Minus, Printer, Phone, Mail, MapPin, Package, X,
} from 'lucide-react';
import { PageContainer, PageHeader, Card, Badge, Button, Input } from '@/components/ui';
import {
  api, ApiError, type ApiSupplier, type ApiPurchase, type SupplierProduct,
} from '@/services/api';
import { formatCurrency, formatRelativeTime, classNames } from '@/utils/format';

interface CartLine {
  product: SupplierProduct;
  quantity: number;
}

export function PurchasesPage() {
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [purchases, setPurchases] = useState<ApiPurchase[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const notify = (text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 3000);
  };

  const loadPurchases = () => api.purchases.list().then(setPurchases).catch(() => undefined);

  useEffect(() => {
    api.suppliers.list().then((s) => {
      setSuppliers(s);
      if (s.length) setSelectedId(s[0].id);
    }).catch(() => notify('Could not load suppliers.', true));
    loadPurchases();
  }, []);

  const selected = useMemo(() => suppliers.find((s) => s.id === selectedId) ?? null, [suppliers, selectedId]);

  const products = useMemo(() => {
    const list = selected?.products ?? [];
    const q = query.toLowerCase();
    return list.filter((p) => p.name.toLowerCase().includes(q) || (p.name_local ?? '').includes(query));
  }, [selected, query]);

  const cartLines = Object.values(cart);
  const total = cartLines.reduce((s, l) => s + l.quantity * l.product.purchase_price, 0);

  const setQty = (product: SupplierProduct, delta: number) => {
    setCart((c) => {
      const current = c[product.id]?.quantity ?? 0;
      const next = Math.max(0, current + delta);
      const copy = { ...c };
      if (next === 0) delete copy[product.id];
      else copy[product.id] = { product, quantity: next };
      return copy;
    });
  };

  const setQtyValue = (product: SupplierProduct, value: string) => {
    const n = Math.max(0, Number(value) || 0);
    setCart((c) => {
      const copy = { ...c };
      if (n === 0) delete copy[product.id];
      else copy[product.id] = { product, quantity: n };
      return copy;
    });
  };

  const clearCart = () => setCart({});

  const placeOrder = async () => {
    if (!selected || cartLines.length === 0) {
      notify('Add at least one product to the order.', true);
      return;
    }
    setBusy(true);
    try {
      await api.purchases.create(
        selected.id,
        cartLines.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
          unit: l.product.default_unit,
          purchase_price: l.product.purchase_price,
        })),
        `Order to ${selected.name}`,
      );
      printOrder(selected, cartLines, total);
      notify(`Order placed with ${selected.name}. PDF ready to print.`);
      clearCart();
      await loadPurchases();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Could not place order.', true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Purchases"
        subtitle="Order products from your suppliers and print the purchase order"
        action={
          <Button size="md" onClick={placeOrder} disabled={busy || cartLines.length === 0}>
            <ShoppingCart className="w-4 h-4" /> Place Order ({cartLines.length})
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suppliers */}
        <Card padding={false} className="overflow-hidden h-fit">
          <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Suppliers</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {suppliers.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedId(s.id); setQuery(''); }}
                className={classNames(
                  'w-full text-left px-5 py-3.5 transition-colors',
                  s.id === selectedId ? 'bg-primary-50 dark:bg-primary-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
                )}
              >
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.products.length} products</p>
              </button>
            ))}
            {suppliers.length === 0 && <p className="px-5 py-6 text-sm text-gray-400 text-center">No suppliers found.</p>}
          </div>
        </Card>

        {/* Products for selected supplier */}
        <Card padding={false} className="lg:col-span-2 overflow-hidden">
          {selected && (
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{selected.name}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {selected.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selected.phone}</span>}
                    {selected.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {selected.email}</span>}
                    {selected.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selected.address}</span>}
                  </div>
                </div>
                <div className="w-full sm:w-56">
                  <Input placeholder="Search products..." value={query} onChange={(e) => setQuery(e.target.value)} icon={<Search className="w-4 h-4" />} />
                </div>
              </div>
            </div>
          )}
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[520px] overflow-y-auto">
            {products.map((p) => {
              const qty = cart[p.id]?.quantity ?? 0;
              return (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-100 to-teal-100 dark:from-primary-500/15 dark:to-teal-500/15 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(p.purchase_price)}/{p.default_unit} · in stock {p.current_stock}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setQty(p, -1)} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      value={qty}
                      onChange={(e) => setQtyValue(p, e.target.value)}
                      className="w-14 text-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                    />
                    <button onClick={() => setQty(p, 1)} className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {products.length === 0 && <p className="px-5 py-10 text-sm text-gray-400 text-center">No products for this supplier.</p>}
          </div>
        </Card>
      </div>

      {/* Order summary */}
      {cartLines.length > 0 && (
        <Card className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Order Summary — {selected?.name}</h3>
            <Button variant="ghost" size="sm" onClick={clearCart}><X className="w-4 h-4" /> Clear</Button>
          </div>
          <div className="space-y-2">
            {cartLines.map((l) => (
              <div key={l.product.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{l.product.name} × {l.quantity} {l.product.default_unit}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(l.quantity * l.product.purchase_price)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 mt-3 pt-3">
            <span className="font-semibold text-gray-900 dark:text-gray-100">Total</span>
            <span className="font-bold text-lg text-gray-900 dark:text-gray-100">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => selected && printOrder(selected, cartLines, total)}>
              <Printer className="w-4 h-4" /> Print PDF
            </Button>
            <Button onClick={placeOrder} disabled={busy}>
              <ShoppingCart className="w-4 h-4" /> {busy ? 'Placing...' : 'Place Order & Print'}
            </Button>
          </div>
        </Card>
      )}

      {/* Recent orders */}
      <Card className="mt-6" padding={false}>
        <div className="px-5 py-3.5 border-b border-gray-200 dark:border-gray-800">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Purchase Orders</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {purchases.map((po) => (
            <div key={po.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{po.supplier_name ?? 'Supplier'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{po.items.length} items · {formatRelativeTime(po.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={po.status === 'received' ? 'success' : 'warning'}>{po.status}</Badge>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(po.total)}</span>
              </div>
            </div>
          ))}
          {purchases.length === 0 && <p className="px-5 py-8 text-sm text-gray-400 text-center">No purchase orders yet.</p>}
        </div>
      </Card>

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

/** Opens a printable purchase order in a new window (use "Save as PDF"). */
function printOrder(supplier: ApiSupplier, lines: CartLine[], total: number) {
  const date = new Date().toLocaleString('en-IN');
  const rows = lines
    .map(
      (l, i) => `<tr>
        <td>${i + 1}</td>
        <td>${l.product.name}</td>
        <td style="text-align:right">${l.quantity} ${l.product.default_unit}</td>
        <td style="text-align:right">₹${l.product.purchase_price.toFixed(2)}</td>
        <td style="text-align:right">₹${(l.quantity * l.product.purchase_price).toFixed(2)}</td>
      </tr>`,
    )
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Purchase Order</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:32px;max-width:720px;margin:auto}
      h1{margin:0;color:#4f46e5}
      .muted{color:#666;font-size:12px}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th,td{border-bottom:1px solid #ddd;padding:8px;font-size:13px;text-align:left}
      th{background:#f5f5f5;text-transform:uppercase;font-size:11px;color:#555}
      tfoot td{font-weight:bold;border-top:2px solid #333}
      .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #4f46e5;padding-bottom:12px}
    </style></head><body>
    <div class="head">
      <div><h1>VoiceStock AI</h1><div class="muted">Purchase Order</div></div>
      <div class="muted" style="text-align:right">Date: ${date}</div>
    </div>
    <h3 style="margin-bottom:2px">Supplier: ${supplier.name}</h3>
    <div class="muted">${[supplier.phone, supplier.email, supplier.address].filter(Boolean).join(' · ')}</div>
    <table>
      <thead><tr><th>#</th><th>Product</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4" style="text-align:right">Total</td><td style="text-align:right">₹${total.toFixed(2)}</td></tr></tfoot>
    </table>
    <p class="muted" style="margin-top:24px">Generated by VoiceStock AI · ${lines.length} product line(s)</p>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`;
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
