import { Tags } from 'lucide-react';
import { PlaceholderPage } from './PlaceholderPage';

export function ProductsPage() {
  return (
    <PlaceholderPage
      title="Products"
      description="Manage your product catalog"
      icon={<Tags className="w-8 h-8" />}
      features={['Add/edit products with local names', 'Categorize products', 'Set pricing & units', 'Bulk import via CSV']}
    />
  );
}
