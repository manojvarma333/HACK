import type {
  Product,
  Transaction,
  VoiceInteraction,
  Alert,
  Supplier,
  Purchase,
  AIActivity,
  DashboardStats,
} from '@/types';

export const mockProducts: Product[] = [
  { id: 'p1', name: 'Basmati Rice', nameLocal: 'बासमती चावल', category: 'Grains', unit: 'kg', stock: 45, minStock: 10, price: 85, cost: 70, supplier: 'Sharma Distributors', lastUpdated: '2026-09-19T08:00:00Z' },
  { id: 'p2', name: 'Wheat Flour', nameLocal: 'आटा', category: 'Grains', unit: 'kg', stock: 8, minStock: 10, price: 42, cost: 35, supplier: 'Sharma Distributors', lastUpdated: '2026-09-19T07:30:00Z' },
  { id: 'p3', name: 'Sugar', nameLocal: 'चीनी', category: 'Essentials', unit: 'kg', stock: 30, minStock: 5, price: 48, cost: 40, supplier: 'Agarwal Wholesale', lastUpdated: '2026-09-18T16:00:00Z' },
  { id: 'p4', name: 'Sunflower Oil', nameLocal: 'सूरजमुखी तेल', category: 'Oils', unit: 'L', stock: 22, minStock: 8, price: 145, cost: 128, supplier: 'Krishna Traders', lastUpdated: '2026-09-18T14:00:00Z' },
  { id: 'p5', name: 'Toor Dal', nameLocal: 'तूर दाल', category: 'Pulses', unit: 'kg', stock: 0, minStock: 10, price: 120, cost: 105, supplier: 'Agarwal Wholesale', lastUpdated: '2026-09-17T11:00:00Z' },
  { id: 'p6', name: 'Tea Leaves', nameLocal: 'चाय पत्ती', category: 'Beverages', unit: 'pack', stock: 55, minStock: 15, price: 220, cost: 180, supplier: 'Red Label Supply', lastUpdated: '2026-09-18T09:00:00Z' },
  { id: 'p7', name: 'Salt', nameLocal: 'नमक', category: 'Essentials', unit: 'kg', stock: 60, minStock: 10, price: 25, cost: 18, supplier: 'Agarwal Wholesale', lastUpdated: '2026-09-16T13:00:00Z' },
  { id: 'p8', name: 'Besan', nameLocal: 'बेसन', category: 'Pulses', unit: 'kg', stock: 5, minStock: 8, price: 75, cost: 62, supplier: 'Sharma Distributors', lastUpdated: '2026-09-19T06:00:00Z' },
  { id: 'p9', name: 'Milk', nameLocal: 'दूध', category: 'Dairy', unit: 'L', stock: 40, minStock: 20, price: 56, cost: 48, supplier: 'Anand Dairy', lastUpdated: '2026-09-19T05:30:00Z' },
  { id: 'p10', name: 'Biscuits (Britannia)', nameLocal: 'बिस्कुट', category: 'Snacks', unit: 'pack', stock: 120, minStock: 30, price: 30, cost: 22, supplier: 'SnackMart', lastUpdated: '2026-09-18T15:00:00Z' },
];

export const mockTransactions: Transaction[] = [
  { id: 't1', type: 'sale', productName: 'Basmati Rice', quantity: 5, unit: 'kg', amount: 425, timestamp: '2026-09-19T09:30:00Z' },
  { id: 't2', type: 'sale', productName: 'Sugar', quantity: 2, unit: 'kg', amount: 96, timestamp: '2026-09-19T09:15:00Z' },
  { id: 't3', type: 'purchase', productName: 'Sunflower Oil', quantity: 20, unit: 'L', amount: 2560, timestamp: '2026-09-19T08:00:00Z' },
  { id: 't4', type: 'sale', productName: 'Tea Leaves', quantity: 2, unit: 'pack', amount: 440, timestamp: '2026-09-19T08:45:00Z' },
  { id: 't5', type: 'sale', productName: 'Milk', quantity: 3, unit: 'L', amount: 168, timestamp: '2026-09-19T08:30:00Z' },
  { id: 't6', type: 'adjustment', productName: 'Wheat Flour', quantity: -2, unit: 'kg', amount: 0, timestamp: '2026-09-19T07:00:00Z' },
  { id: 't7', type: 'sale', productName: 'Biscuits (Britannia)', quantity: 10, unit: 'pack', amount: 300, timestamp: '2026-09-18T18:00:00Z' },
  { id: 't8', type: 'sale', productName: 'Salt', quantity: 1, unit: 'kg', amount: 25, timestamp: '2026-09-18T17:30:00Z' },
];

export const mockVoiceInteractions: VoiceInteraction[] = [
  { id: 'v1', transcript: 'Add 5 kg rice', intent: 'add_stock', confidence: 0.96, action: 'Added 5 kg to Basmati Rice', response: 'Done! Basmati Rice stock updated to 50 kg.', language: 'en', timestamp: '2026-09-19T09:30:00Z' },
  { id: 'v2', transcript: '5 kilo biyyam add cheyyi', intent: 'add_stock', confidence: 0.91, action: 'Added 5 kg to Rice', response: ' రైస్ కి 5 kg add చేశాను. Total: 50 kg.', language: 'te', timestamp: '2026-09-19T09:15:00Z' },
  { id: 'v3', transcript: 'Do kilo cheeni nikaal do', intent: 'remove_stock', confidence: 0.88, action: 'Removed 2 kg from Sugar', response: 'चीनी से 2 kg निकाल दिए। बाकी: 30 kg.', language: 'hi', timestamp: '2026-09-19T08:45:00Z' },
  { id: 'v4', transcript: 'How much rice is left?', intent: 'query_stock', confidence: 0.94, action: 'Queried rice stock', response: 'You have 50 kg of Basmati Rice in stock.', language: 'en', timestamp: '2026-09-19T08:30:00Z' },
  { id: 'v5', transcript: 'No, make it 5 kg', intent: 'correct_entry', confidence: 0.87, action: 'Corrected last entry to 5 kg', response: 'Got it! Updated the quantity to 5 kg.', language: 'en', timestamp: '2026-09-19T08:31:00Z' },
  { id: 'v6', transcript: 'Tea leaves ka stock kya hai', intent: 'query_stock', confidence: 0.90, action: 'Queried tea stock', response: 'Tea Leaves में 55 packs हैं।', language: 'hi', timestamp: '2026-09-19T07:45:00Z' },
];

export const mockAlerts: Alert[] = [
  { id: 'a1', type: 'out-of-stock', severity: 'critical', productName: 'Toor Dal', message: 'Toor Dal is completely out of stock', timestamp: '2026-09-19T06:00:00Z', resolved: false },
  { id: 'a2', type: 'low-stock', severity: 'warning', productName: 'Wheat Flour', message: 'Wheat Flour below minimum (8 kg left)', timestamp: '2026-09-19T07:30:00Z', resolved: false },
  { id: 'a3', type: 'low-stock', severity: 'warning', productName: 'Besan', message: 'Besan below minimum (5 kg left)', timestamp: '2026-09-19T06:00:00Z', resolved: false },
  { id: 'a4', type: 'expiring', severity: 'info', productName: 'Milk', message: 'Milk batch expiring in 2 days', timestamp: '2026-09-19T05:30:00Z', resolved: false },
];

export const mockSuppliers: Supplier[] = [
  { id: 's1', name: 'Sharma Distributors', phone: '+91 98765 43210', email: 'sharma@dist.com', address: 'Market Road, Delhi', productsSupplied: ['Rice', 'Wheat Flour', 'Besan'], rating: 4.5 },
  { id: 's2', name: 'Agarwal Wholesale', phone: '+91 98111 22334', email: 'agarwal@wh.com', address: 'Chandni Chowk, Delhi', productsSupplied: ['Sugar', 'Salt', 'Toor Dal'], rating: 4.2 },
  { id: 's3', name: 'Krishna Traders', phone: '+91 97000 55667', email: 'krishna@traders.com', address: 'Wholesale Market, Delhi', productsSupplied: ['Sunflower Oil'], rating: 4.7 },
  { id: 's4', name: 'Anand Dairy', phone: '+91 96500 88990', email: 'anand@dairy.com', address: 'Dairy Farm, Noida', productsSupplied: ['Milk', 'Curd', 'Paneer'], rating: 4.8 },
  { id: 's5', name: 'Red Label Supply', phone: '+91 98300 11223', email: 'redlabel@supply.com', address: 'Tea Garden Road, Kolkata', productsSupplied: ['Tea Leaves'], rating: 4.0 },
];

export const mockPurchases: Purchase[] = [
  { id: 'pu1', supplier: 'Krishna Traders', items: [{ name: 'Sunflower Oil', quantity: 20, unit: 'L', cost: 128 }], total: 2560, status: 'received', date: '2026-09-19T08:00:00Z' },
  { id: 'pu2', supplier: 'Anand Dairy', items: [{ name: 'Milk', quantity: 40, unit: 'L', cost: 48 }], total: 1920, status: 'received', date: '2026-09-19T05:30:00Z' },
  { id: 'pu3', supplier: 'Sharma Distributors', items: [{ name: 'Basmati Rice', quantity: 50, unit: 'kg', cost: 70 }, { name: 'Wheat Flour', quantity: 30, unit: 'kg', cost: 35 }], total: 4550, status: 'pending', date: '2026-09-20T00:00:00Z' },
  { id: 'pu4', supplier: 'Agarwal Wholesale', items: [{ name: 'Toor Dal', quantity: 25, unit: 'kg', cost: 105 }, { name: 'Sugar', quantity: 50, unit: 'kg', cost: 40 }], total: 4625, status: 'pending', date: '2026-09-21T00:00:00Z' },
];

export const mockAIActivities: AIActivity[] = [
  { id: 'ai1', type: 'voice', title: 'Voice command processed', description: '"Add 5 kg rice" → Basmati Rice stock updated', timestamp: '2026-09-19T09:30:00Z', impact: 'Stock +5 kg' },
  { id: 'ai2', type: 'prediction', title: 'Restock prediction', description: 'Wheat Flour expected to run out in 2 days', timestamp: '2026-09-19T06:00:00Z', impact: 'Alert generated' },
  { id: 'ai3', type: 'automation', title: 'Auto reorder suggestion', description: 'Toor Dal is out of stock — order placed to Agarwal Wholesale', timestamp: '2026-09-19T06:00:00Z', impact: 'Purchase created' },
  { id: 'ai4', type: 'insight', title: 'Sales insight', description: 'Tea Leaves sales up 23% this week', timestamp: '2026-09-19T05:00:00Z', impact: 'Trending product' },
  { id: 'ai5', type: 'voice', title: 'Multilingual command', description: 'Telugu: "5 kilo biyyam add cheyyi" → Rice +5 kg', timestamp: '2026-09-19T09:15:00Z', impact: 'Stock +5 kg' },
  { id: 'ai6', type: 'voice', title: 'Correction handled', description: '"No, make it 5 kg" → corrected previous entry', timestamp: '2026-09-19T08:31:00Z', impact: 'Entry corrected' },
];

export const mockDashboardStats: DashboardStats = {
  totalProducts: 10,
  totalStockValue: 28450,
  lowStockCount: 3,
  todaySales: 1429,
  todayTransactions: 6,
  voiceCommandsToday: 8,
  stockTrend: [
    { day: 'Mon', value: 32000 }, { day: 'Tue', value: 30500 }, { day: 'Wed', value: 29800 },
    { day: 'Thu', value: 31000 }, { day: 'Fri', value: 28450 }, { day: 'Sat', value: 27200 },
    { day: 'Sun', value: 28450 },
  ],
  salesTrend: [
    { day: 'Mon', sales: 2100 }, { day: 'Tue', sales: 1800 }, { day: 'Wed', sales: 2400 },
    { day: 'Thu', sales: 1600 }, { day: 'Fri', sales: 1429 }, { day: 'Sat', sales: 3200 },
    { day: 'Sun', sales: 2800 },
  ],
  topProducts: [
    { name: 'Basmati Rice', unitsSold: 25, revenue: 2125 },
    { name: 'Tea Leaves', unitsSold: 15, revenue: 3300 },
    { name: 'Milk', unitsSold: 30, revenue: 1680 },
    { name: 'Sunflower Oil', unitsSold: 8, revenue: 1160 },
    { name: 'Sugar', unitsSold: 12, revenue: 576 },
  ],
};
