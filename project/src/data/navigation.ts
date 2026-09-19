export const navItems = [
  { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
  { label: 'Voice Assistant', path: '/voice', icon: 'Mic' },
  { label: 'Inventory', path: '/inventory', icon: 'Package' },
  { label: 'Analytics', path: '/analytics', icon: 'BarChart3' },
  { label: 'Alerts', path: '/alerts', icon: 'Bell' },
  { label: 'Voice History', path: '/voice-history', icon: 'History' },
  { label: 'Purchases', path: '/purchases', icon: 'ShoppingCart' },
  { label: 'Settings', path: '/settings', icon: 'Settings' },
] as const;

export const mobileNavItems = [
  { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
  { label: 'Voice', path: '/voice', icon: 'Mic' },
  { label: 'Inventory', path: '/inventory', icon: 'Package' },
  { label: 'Analytics', path: '/analytics', icon: 'BarChart3' },
  { label: 'Settings', path: '/settings', icon: 'Settings' },
] as const;
