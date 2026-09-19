import { Bell } from 'lucide-react';
import { PlaceholderPage } from './PlaceholderPage';

export function AlertsPage() {
  return (
    <PlaceholderPage
      title="Alerts"
      description="Low stock, expiry, and price change notifications"
      icon={<Bell className="w-8 h-8" />}
      features={['Low stock & out-of-stock alerts', 'Expiry warnings', 'Price change notifications', 'Alert resolution tracking']}
    />
  );
}
