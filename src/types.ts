export type Screen = 'dashboard' | 'restock' | 'inventory' | 'orders' | 'settings';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: string;
  minThreshold: number;
  parLevel: number;
}

export interface OrderItem {
  name: string;
  quantity: number;
}

export interface Order {
  id: string;
  table: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'ready' | 'served';
  time: string;
  createdAt: number;
}

export interface AppState {
  inventory: InventoryItem[];
  orders: Order[];
}
