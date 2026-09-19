import { ShoppingCart } from 'lucide-react';
import { PlaceholderPage } from './PlaceholderPage';

export function PurchasesPage() {
  return (
    <PlaceholderPage
      title="Purchases"
      description="Purchase orders and receiving"
      icon={<ShoppingCart className="w-8 h-8" />}
      features={['Create purchase orders', 'Track order status', 'Receive & verify deliveries', 'Auto-generated reorders']}
    />
  );
}
