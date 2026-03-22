import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AppState, InventoryItem, Order } from './types';

// --- Initial Data ---

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Wagyu Ribeye', category: 'Proteins', quantity: 12, unit: 'kg', status: 'healthy', lastUpdated: new Date().toISOString(), minThreshold: 5 },
  { id: '2', name: 'Truffle Oil', category: 'Pantry', quantity: 0.5, unit: 'L', status: 'critical', lastUpdated: new Date().toISOString(), minThreshold: 2 },
  { id: '3', name: 'Heirloom Tomatoes', category: 'Produce', quantity: 5, unit: 'kg', status: 'warning', lastUpdated: new Date().toISOString(), minThreshold: 4 },
  { id: '4', name: 'Heavy Cream', category: 'Dairy', quantity: 15, unit: 'L', status: 'healthy', lastUpdated: new Date().toISOString(), minThreshold: 5 },
  { id: '5', name: 'Sea Salt', category: 'Pantry', quantity: 2, unit: 'kg', status: 'warning', lastUpdated: new Date().toISOString(), minThreshold: 1.5 },
];

const INITIAL_ORDERS: Order[] = [
  { id: 'ORD-1024', table: 'T-04', items: [{ name: 'Wagyu Steak', quantity: 2 }, { name: 'Red Wine Jus', quantity: 1 }], status: 'preparing', time: '12:45', createdAt: Date.now() - 900000 },
  { id: 'ORD-1025', table: 'T-12', items: [{ name: 'Truffle Pasta', quantity: 1 }, { name: 'Burrata Salad', quantity: 1 }], status: 'pending', time: '12:50', createdAt: Date.now() - 600000 },
  { id: 'ORD-1026', table: 'T-02', items: [{ name: 'Roasted Chicken', quantity: 1 }, { name: 'Asparagus', quantity: 1 }], status: 'ready', time: '12:30', createdAt: Date.now() - 1800000 },
];

// --- Actions ---

type Action =
  | { type: 'ADD_INVENTORY'; item: InventoryItem }
  | { type: 'UPDATE_INVENTORY'; item: InventoryItem }
  | { type: 'DELETE_INVENTORY'; id: string }
  | { type: 'ADD_ORDER'; order: Order }
  | { type: 'UPDATE_ORDER_STATUS'; id: string; status: Order['status'] }
  | { type: 'DELETE_ORDER'; id: string };

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
    case 'ADD_ORDER':
      return { ...state, orders: [action.order, ...state.orders] };
    case 'UPDATE_ORDER_STATUS':
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.id ? { ...o, status: action.status } : o
        ),
      };
    case 'DELETE_ORDER':
      return { ...state, orders: state.orders.filter((o) => o.id !== action.id) };
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
    if (raw) return JSON.parse(raw);
  } catch {}
  return { inventory: INITIAL_INVENTORY, orders: INITIAL_ORDERS };
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
