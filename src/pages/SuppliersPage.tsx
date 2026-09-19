import { Truck } from 'lucide-react';
import { PlaceholderPage } from './PlaceholderPage';

export function SuppliersPage() {
  return (
    <PlaceholderPage
      title="Suppliers"
      description="Manage your supplier network"
      icon={<Truck className="w-8 h-8" />}
      features={['Supplier directory with contact info', 'Product-supplier mapping', 'Delivery ratings', 'One-tap reorder']}
    />
  );
}
