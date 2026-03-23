import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AppState, InventoryItem, StaffMember, AttendanceRecord } from './types';

// --- Initial Data ---

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Wagyu Ribeye', category: 'Proteins', quantity: 12, unit: 'kg', status: 'healthy', lastUpdated: new Date().toISOString(), minThreshold: 5, parLevel: 15 },
  { id: '2', name: 'Truffle Oil', category: 'Pantry', quantity: 0.5, unit: 'L', status: 'critical', lastUpdated: new Date().toISOString(), minThreshold: 2, parLevel: 5 },
  { id: '3', name: 'Heirloom Tomatoes', category: 'Produce', quantity: 5, unit: 'kg', status: 'warning', lastUpdated: new Date().toISOString(), minThreshold: 4, parLevel: 10 },
  { id: '4', name: 'Heavy Cream', category: 'Dairy', quantity: 15, unit: 'L', status: 'healthy', lastUpdated: new Date().toISOString(), minThreshold: 5, parLevel: 20 },
  { id: '5', name: 'Sea Salt', category: 'Pantry', quantity: 2, unit: 'kg', status: 'warning', lastUpdated: new Date().toISOString(), minThreshold: 1.5, parLevel: 5 },
];

const INITIAL_STAFF: StaffMember[] = [
  { id: 's1', name: 'Alice Chen', role: 'Head Chef', hourlyRate: 25 },
  { id: 's2', name: 'Bob Tan', role: 'Sous Chef', hourlyRate: 18 },
  { id: 's3', name: 'Carol Lim', role: 'Waiter', hourlyRate: 12 },
  { id: 's4', name: 'David Wong', role: 'Cashier', hourlyRate: 12 },
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
  | { type: 'DELETE_ATTENDANCE'; id: string };

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
        return {
          ...state,
          attendance: state.attendance.map((a, i) => (i === idx ? action.record : a)),
        };
      }
      return { ...state, attendance: [...state.attendance, action.record] };
    }
    case 'DELETE_ATTENDANCE':
      return { ...state, attendance: state.attendance.filter((a) => a.id !== action.id) };

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
      // Migrate inventory: add parLevel if missing
      parsed.inventory = (parsed.inventory ?? INITIAL_INVENTORY).map((item: InventoryItem) => ({
        ...item,
        parLevel: item.parLevel ?? item.minThreshold * 2,
      }));
      // Migrate: add staff/attendance if missing (older saves had orders instead)
      if (!parsed.staff) parsed.staff = INITIAL_STAFF;
      if (!parsed.attendance) parsed.attendance = [];
      // Remove orders key if present
      delete parsed.orders;
      return parsed;
    }
  } catch {}
  return { inventory: INITIAL_INVENTORY, staff: INITIAL_STAFF, attendance: [] };
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
