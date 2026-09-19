import { ArrowLeftRight } from 'lucide-react';
import { PlaceholderPage } from './PlaceholderPage';

export function TransactionsPage() {
  return (
    <PlaceholderPage
      title="Transactions"
      description="All sales, purchases, and adjustments"
      icon={<ArrowLeftRight className="w-8 h-8" />}
      features={['Sale & purchase records', 'Stock adjustments log', 'Date filtering', 'Export to PDF/Excel']}
    />
  );
}
