import type { ApiProduct, ApiTransaction } from '@/services/api';

export interface ProductSales {
  productId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  unit: string;
}

/** Sales are REMOVE transactions (stock leaving the shop). */
export function salesByProduct(
  transactions: ApiTransaction[],
  products: ApiProduct[],
): ProductSales[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.action !== 'REMOVE') continue;
    totals.set(t.product_id, (totals.get(t.product_id) ?? 0) + t.normalized_quantity);
  }
  const result: ProductSales[] = [];
  for (const p of products) {
    const units = totals.get(p.id) ?? 0;
    result.push({
      productId: p.id,
      name: p.name,
      unitsSold: units,
      revenue: units * p.selling_price,
      unit: p.base_unit,
    });
  }
  return result.sort((a, b) => b.unitsSold - a.unitsSold);
}

export interface DaySales {
  day: string;
  label: string;
  sales: number;
}

/** Revenue per day for the last `days` days from REMOVE transactions. */
export function salesByDay(
  transactions: ApiTransaction[],
  products: ApiProduct[],
  days = 7,
): DaySales[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const buckets: DaySales[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    buckets.push({
      day: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      sales: 0,
    });
  }
  const idx = new Map(buckets.map((b, i) => [b.day, i]));
  for (const t of transactions) {
    if (t.action !== 'REMOVE') continue;
    const key = new Date(t.created_at).toISOString().slice(0, 10);
    const i = idx.get(key);
    if (i === undefined) continue;
    const product = byId.get(t.product_id);
    buckets[i].sales += t.normalized_quantity * (product?.selling_price ?? 0);
  }
  return buckets;
}

export function totalStockValue(products: ApiProduct[]): number {
  return products.reduce((sum, p) => sum + p.current_stock * p.purchase_price, 0);
}

export type StockLevel = 'out' | 'critical' | 'low' | 'ok';

export function stockLevel(p: ApiProduct): StockLevel {
  if (p.current_stock <= 0) return 'out';
  if (p.current_stock <= p.critical_stock) return 'critical';
  if (p.current_stock <= p.min_stock) return 'low';
  return 'ok';
}
