import { BarChart3 } from 'lucide-react';
import { PlaceholderPage } from './PlaceholderPage';

export function AnalyticsPage() {
  return (
    <PlaceholderPage
      title="Analytics"
      description="Sales trends and business insights"
      icon={<BarChart3 className="w-8 h-8" />}
      features={['Revenue & profit charts', 'Top-selling products', 'Stock movement analysis', 'AI-powered demand forecasting']}
    />
  );
}
