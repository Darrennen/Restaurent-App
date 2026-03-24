import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AppState, InventoryItem, StaffMember, AttendanceRecord, StockRequest } from './types';

// --- Initial Data ---

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Wagyu Ribeye', category: 'Proteins', quantity: 12, unit: 'kg', status: 'healthy', lastUpdated: new Date().toISOString(), minThreshold: 5, parLevel: 15 },
  { id: '2', name: 'Truffle Oil', category: 'Pantry', quantity: 0.5, unit: 'L', status: 'critical', lastUpdated: new Date().toISOString(), minThreshold: 2, parLevel: 5 },
  { id: '3', name: 'Heirloom Tomatoes', category: 'Produce', quantity: 5, unit: 'kg', status: 'warning', lastUpdated: new Date().toISOString(), minThreshold: 4, parLevel: 10 },
  { id: '4', name: 'Heavy Cream', category: 'Dairy', quantity: 15, unit: 'L', status: 'healthy', lastUpdated: new Date().toISOString(), minThreshold: 5, parLevel: 20 },
  { id: '5', name: 'Sea Salt', category: 'Pantry', quantity: 2, unit: 'kg', status: 'warning', lastUpdated: new Date().toISOString(), minThreshold: 1.5, parLevel: 5 },
];

const INITIAL_STAFF: StaffMember[] = [
  { id: 's1', name: 'Alice Chen', role: 'Head Chef', hourlyRate: 25, pin: '1111' },
  { id: 's2', name: 'Bob Tan', role: 'Sous Chef', hourlyRate: 18, pin: '2222' },
  { id: 's3', name: 'Carol Lim', role: 'Waiter', hourlyRate: 12, pin: '3333' },
  { id: 's4', name: 'David Wong', role: 'Cashier', hourlyRate: 12, pin: '4444' },
];

// --- Actions ---

type Action =
  | { type: 'ADD_INVENTORY'; item: InventoryItem }
  | { type: 'UPDATE_INVENTORY'; item: InventoryItem }
  | { type: 'DELETE_INVENTORY'; id: string }
  | { type: 'ADD_STAFF'; member: StaffMember }
  | { type: 'UPDATE_STAFF'; member: StaffMember }
  | { type: 'DELETE_STAFF'; id: string }
  | { type: 'SET_ATTENDANCE'; record: AttendanceRecord }
  | { type: 'DELETE_ATTENDANCE'; id: string }
  | { type: 'CLOCK_IN'; staffId: string; date: string; timestamp: string }
  | { type: 'CLOCK_OUT'; staffId: string; date: string; timestamp: string }
  | { type: 'SET_MANAGER_PIN'; pin: string }
  | { type: 'ADD_STOCK_REQUEST'; request: StockRequest }
  | { type: 'DELETE_STOCK_REQUEST'; id: string };

function computeStatus(quantity: number, minThreshold: number): InventoryItem['status'] {
  if (quantity <= 0) return 'critical';
  if (quantity <= minThreshold) return 'warning';
  return 'healthy';
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_INVENTORY':
      return { ...state, inventory: [...state.inventory, action.item] };
    case 'UPDATE_INVENTORY':
      return {
        ...state,
        inventory: state.inventory.map((i) =>
          i.id === action.item.id
            ? { ...action.item, status: computeStatus(action.item.quantity, action.item.minThreshold), lastUpdated: new Date().toISOString() }
            : i
        ),
      };
    case 'DELETE_INVENTORY':
      return { ...state, inventory: state.inventory.filter((i) => i.id !== action.id) };

    case 'ADD_STAFF':
      return { ...state, staff: [...state.staff, action.member] };
    case 'UPDATE_STAFF':
      return { ...state, staff: state.staff.map((s) => (s.id === action.member.id ? action.member : s)) };
    case 'DELETE_STAFF':
      return {
        ...state,
        staff: state.staff.filter((s) => s.id !== action.id),
        attendance: state.attendance.filter((a) => a.staffId !== action.id),
      };

    case 'SET_ATTENDANCE': {
      const idx = state.attendance.findIndex(
        (a) => a.staffId === action.record.staffId && a.date === action.record.date
      );
      if (idx >= 0) {
        return { ...state, attendance: state.attendance.map((a, i) => (i === idx ? action.record : a)) };
      }
      return { ...state, attendance: [...state.attendance, action.record] };
    }
    case 'DELETE_ATTENDANCE':
      return { ...state, attendance: state.attendance.filter((a) => a.id !== action.id) };

    case 'CLOCK_IN': {
      const existing = state.attendance.find(
        (a) => a.staffId === action.staffId && a.date === action.date
      );
      if (existing?.clockIn) return state; // already clocked in today
      const updated: AttendanceRecord = existing
        ? { ...existing, clockIn: action.timestamp }
        : { id: `${action.staffId}-${action.date}`, staffId: action.staffId, date: action.date, hoursWorked: 0, clockIn: action.timestamp };
      const idx = state.attendance.findIndex((a) => a.staffId === action.staffId && a.date === action.date);
      return {
        ...state,
        attendance: idx >= 0
          ? state.attendance.map((a, i) => (i === idx ? updated : a))
          : [...state.attendance, updated],
      };
    }

    case 'CLOCK_OUT': {
      const idx = state.attendance.findIndex(
        (a) => a.staffId === action.staffId && a.date === action.date
      );
      if (idx < 0) return state;
      const record = state.attendance[idx];
      if (!record.clockIn || record.clockOut) return state; // nothing to clock out of
      const ms = new Date(action.timestamp).getTime() - new Date(record.clockIn).getTime();
      const hoursWorked = Math.round((ms / 3600000) * 2) / 2; // round to nearest 0.5
      return {
        ...state,
        attendance: state.attendance.map((a, i) =>
          i === idx ? { ...a, clockOut: action.timestamp, hoursWorked } : a
        ),
      };
    }

    case 'SET_MANAGER_PIN':
      return { ...state, managerPin: action.pin };

    case 'ADD_STOCK_REQUEST':
      return { ...state, stockRequests: [action.request, ...state.stockRequests] };

    case 'DELETE_STOCK_REQUEST':
      return { ...state, stockRequests: state.stockRequests.filter((r) => r.id !== action.id) };

    default:
      return state;
  }
}

// --- Context ---

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEY = 'kinetic-kitchen-state';

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.inventory = (parsed.inventory ?? INITIAL_INVENTORY).map((item: InventoryItem) => ({
        ...item,
        parLevel: item.parLevel ?? item.minThreshold * 2,
      }));
      if (!parsed.staff) parsed.staff = INITIAL_STAFF;
      // Migrate: add PIN to staff without one
      parsed.staff = parsed.staff.map((s: StaffMember, i: number) => ({
        ...s,
        pin: s.pin ?? String(1001 + i),
      }));
      if (!parsed.attendance) parsed.attendance = [];
      if (!parsed.managerPin) parsed.managerPin = '0000';
      if (!parsed.stockRequests) parsed.stockRequests = [];
      delete parsed.orders;
      return parsed;
    }
  } catch {}
  return { inventory: INITIAL_INVENTORY, staff: INITIAL_STAFF, attendance: [], managerPin: '0000', stockRequests: [] };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
