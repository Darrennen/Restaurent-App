export type Screen = 'dashboard' | 'restock' | 'inventory' | 'attendance' | 'settings';

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

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  hourlyRate: number;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  hoursWorked: number;
}

export interface AppState {
  inventory: InventoryItem[];
  staff: StaffMember[];
  attendance: AttendanceRecord[];
}
