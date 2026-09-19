export const navItems = [
  { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
  { label: 'Voice Assistant', path: '/voice', icon: 'Mic' },
  { label: 'Inventory', path: '/inventory', icon: 'Package' },
  { label: 'Products', path: '/products', icon: 'Tags' },
  { label: 'Analytics', path: '/analytics', icon: 'BarChart3' },
  { label: 'Transactions', path: '/transactions', icon: 'ArrowLeftRight' },
  { label: 'Alerts', path: '/alerts', icon: 'Bell' },
  { label: 'AI Activity', path: '/ai-activity', icon: 'BrainCircuit' },
  { label: 'Voice History', path: '/voice-history', icon: 'History' },
  { label: 'Suppliers', path: '/suppliers', icon: 'Truck' },
  { label: 'Purchases', path: '/purchases', icon: 'ShoppingCart' },
  { label: 'Settings', path: '/settings', icon: 'Settings' },
  { label: 'Help', path: '/help', icon: 'HelpCircle' },
] as const;

export const mobileNavItems = [
  { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
  { label: 'Voice', path: '/voice', icon: 'Mic' },
  { label: 'Inventory', path: '/inventory', icon: 'Package' },
  { label: 'Analytics', path: '/analytics', icon: 'BarChart3' },
  { label: 'Settings', path: '/settings', icon: 'Settings' },
] as const;
