export type ThemeMode = 'light' | 'dark';

export interface Product {
  id: string;
  name: string;
  nameLocal?: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  price: number;
  cost: number;
  supplier: string;
  lastUpdated: string;
}

export interface Transaction {
  id: string;
  type: 'sale' | 'purchase' | 'adjustment';
  productName: string;
  quantity: number;
  unit: string;
  amount: number;
  timestamp: string;
}

export interface VoiceInteraction {
  id: string;
  transcript: string;
  intent: string;
  confidence: number;
  action: string;
  response: string;
  language: 'en' | 'hi' | 'te';
  timestamp: string;
}

export interface Alert {
  id: string;
  type: 'low-stock' | 'out-of-stock' | 'expiring' | 'price-change';
  severity: 'critical' | 'warning' | 'info';
  productName: string;
  message: string;
  timestamp: string;
  resolved: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  productsSupplied: string[];
  rating: number;
}

export interface Purchase {
  id: string;
  supplier: string;
  items: { name: string; quantity: number; unit: string; cost: number }[];
  total: number;
  status: 'pending' | 'received' | 'cancelled';
  date: string;
}

export interface AIActivity {
  id: string;
  type: 'voice' | 'prediction' | 'automation' | 'insight';
  title: string;
  description: string;
  timestamp: string;
  impact: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  todaySales: number;
  todayTransactions: number;
  voiceCommandsToday: number;
  stockTrend: { day: string; value: number }[];
  salesTrend: { day: string; sales: number }[];
  topProducts: { name: string; unitsSold: number; revenue: number }[];
}

export type NavLink = {
  label: string;
  path: string;
  icon: string;
};
