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
import {
  mockProducts,
  mockTransactions,
  mockVoiceInteractions,
  mockAlerts,
  mockSuppliers,
  mockPurchases,
  mockAIActivities,
  mockDashboardStats,
} from '@/data/mockData';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockService = {
  async getProducts(): Promise<Product[]> {
    await delay(200);
    return mockProducts;
  },
  async getTransactions(): Promise<Transaction[]> {
    await delay(200);
    return mockTransactions;
  },
  async getVoiceInteractions(): Promise<VoiceInteraction[]> {
    await delay(200);
    return mockVoiceInteractions;
  },
  async getAlerts(): Promise<Alert[]> {
    await delay(200);
    return mockAlerts;
  },
  async getSuppliers(): Promise<Supplier[]> {
    await delay(200);
    return mockSuppliers;
  },
  async getPurchases(): Promise<Purchase[]> {
    await delay(200);
    return mockPurchases;
  },
  async getAIActivities(): Promise<AIActivity[]> {
    await delay(200);
    return mockAIActivities;
  },
  async getDashboardStats(): Promise<DashboardStats> {
    await delay(200);
    return mockDashboardStats;
  },
};
