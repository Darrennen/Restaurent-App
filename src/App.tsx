import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Settings,
  LogOut,
  Plus,
  Search,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Clock,
  X,
  Trash2,
  Edit2,
  Bot,
  Send,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './context';
import { askAI, getReorderSuggestions } from './ai';
import type { Screen, InventoryItem, Order, OrderItem } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function newId(prefix: string) {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function timeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Shared Components ───────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: InventoryItem['status'] }) => {
  const styles = {
    healthy: 'status-healthy',
    warning: 'status-warning',
    critical: 'status-critical',
  };
  return <span className={`status-block ${styles[status]}`}>{status}</span>;
};

const OrderStatusBadge = ({ status }: { status: Order['status'] }) => {
  const styles: Record<Order['status'], string> = {
    pending: 'bg-secondary-container text-on-secondary-container',
    preparing: 'bg-primary text-on-primary',
    ready: 'bg-emerald-100 text-emerald-800',
    served: 'bg-surface-container-high text-on-surface-variant',
  };
  return (
    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm ${styles[status]}`}>
      {status}
    </span>
  );
};

const Modal = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="bg-surface-container-lowest rounded-md shadow-2xl w-full max-w-md mx-4 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center px-6 py-4 bg-surface-container-low border-b border-surface-container-high">
        <h2 className="text-lg font-bold">{title}</h2>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-surface-container-highest text-on-surface-variant"
        >
          <X size={18} />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  </div>
);

// ─── Inventory Modal ─────────────────────────────────────────────────────────

const CATEGORIES = ['Proteins', 'Produce', 'Dairy', 'Pantry', 'Beverages', 'Dry Goods', 'Other'];
const UNITS = ['kg', 'g', 'L', 'mL', 'units', 'boxes', 'bottles', 'portions'];

function InventoryModal({
  item,
  onClose,
}: {
  item: InventoryItem | null;
  onClose: () => void;
}) {
  const { dispatch } = useApp();
  const [form, setForm] = useState({
    name: item?.name ?? '',
    category: item?.category ?? 'Proteins',
    quantity: item?.quantity?.toString() ?? '',
    unit: item?.unit ?? 'kg',
    minThreshold: item?.minThreshold?.toString() ?? '',
  });

  function handleSave() {
    if (!form.name.trim() || !form.quantity || !form.minThreshold) return;
    const qty = parseFloat(form.quantity);
    const threshold = parseFloat(form.minThreshold);
    const status: InventoryItem['status'] =
      qty <= 0 ? 'critical' : qty <= threshold ? 'warning' : 'healthy';

    if (item) {
      dispatch({
        type: 'UPDATE_INVENTORY',
        item: {
          ...item,
          ...form,
          quantity: qty,
          minThreshold: threshold,
          status,
          lastUpdated: new Date().toISOString(),
        },
      });
    } else {
      dispatch({
        type: 'ADD_INVENTORY',
        item: {
          id: newId('INV'),
          name: form.name.trim(),
          category: form.category,
          quantity: qty,
          unit: form.unit,
          minThreshold: threshold,
          status,
          lastUpdated: new Date().toISOString(),
        },
      });
    }
    onClose();
  }

  return (
    <Modal title={item ? 'Edit Item' : 'New Inventory Item'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">
            Item Name
          </label>
          <input
            className="input-industrial w-full"
            placeholder="e.g. Wagyu Ribeye"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">
              Category
            </label>
            <select
              className="input-industrial w-full"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">
              Unit
            </label>
            <select
              className="input-industrial w-full"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            >
              {UNITS.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">
              Quantity
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              className="input-industrial w-full"
              placeholder="0"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">
              Min Threshold
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              className="input-industrial w-full"
              placeholder="0"
              value={form.minThreshold}
              onChange={(e) => setForm((f) => ({ ...f, minThreshold: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary flex-1"
            disabled={!form.name.trim() || !form.quantity || !form.minThreshold}
          >
            {item ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Order Modal ─────────────────────────────────────────────────────────────

function OrderModal({ onClose }: { onClose: () => void }) {
  const { dispatch } = useApp();
  const [table, setTable] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ name: '', quantity: 1 }]);

  function addItem() {
    setItems((prev) => [...prev, { name: '', quantity: 1 }]);
  }

  function updateItem(i: number, field: keyof OrderItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item))
    );
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleCreate() {
    const validItems = items.filter((i) => i.name.trim());
    if (!table.trim() || validItems.length === 0) return;
    const now = new Date();
    dispatch({
      type: 'ADD_ORDER',
      order: {
        id: newId('ORD'),
        table: table.toUpperCase(),
        items: validItems,
        status: 'pending',
        time: formatTime(now),
        createdAt: now.getTime(),
      },
    });
    onClose();
  }

  return (
    <Modal title="New Order" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">
            Table
          </label>
          <input
            className="input-industrial w-full"
            placeholder="e.g. T-05"
            value={table}
            onChange={(e) => setTable(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 block">
            Items
          </label>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className="input-industrial flex-1 min-w-0"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateItem(i, 'name', e.target.value)}
                />
                <input
                  type="number"
                  min="1"
                  className="input-industrial w-16 text-center"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(i, 'quantity', parseInt(e.target.value) || 1)
                  }
                />
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(i)}
                    className="text-error hover:bg-error/10 p-1.5 rounded"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addItem}
            className="btn-tertiary text-sm mt-2 px-0 flex items-center gap-1"
          >
            <Plus size={14} /> Add Item
          </button>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="btn-primary flex-1"
            disabled={!table.trim() || items.every((i) => !i.name.trim())}
          >
            Create Order
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── AI Assistant Panel ───────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

function AIAssistant({ onClose }: { onClose: () => void }) {
  const { state } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'ai',
      text: "Hello! I'm KAI, your kitchen AI. Ask me anything about inventory, orders, or get reorder suggestions.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const hasKey = !!process.env.GEMINI_API_KEY;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const reply = await askAI(userMsg, state.inventory, state.orders);
      setMessages((m) => [...m, { role: 'ai', text: reply }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setMessages((m) => [...m, { role: 'ai', text: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  async function suggestReorders() {
    setLoading(true);
    setMessages((m) => [...m, { role: 'user', text: 'What should I reorder?' }]);
    try {
      const reply = await getReorderSuggestions(state.inventory);
      setMessages((m) => [...m, { role: 'ai', text: reply }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setMessages((m) => [...m, { role: 'ai', text: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        className="bg-surface-container-lowest rounded-md shadow-2xl w-full max-w-sm h-[520px] flex flex-col overflow-hidden pointer-events-auto border border-surface-container-high"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-inverse-surface text-on-inverse-surface">
          <div className="flex items-center gap-2">
            <Bot size={18} />
            <span className="font-bold text-sm">KAI — Kitchen AI</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={suggestReorders}
              disabled={loading || !hasKey}
              className="text-on-inverse-surface/60 hover:text-on-inverse-surface transition-colors disabled:opacity-40"
              title="Get reorder suggestions"
            >
              <Sparkles size={16} />
            </button>
            <button
              onClick={onClose}
              className="text-on-inverse-surface/60 hover:text-on-inverse-surface transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {!hasKey && (
          <div className="px-4 py-2 bg-primary-container/30 text-on-primary text-xs border-b border-surface-container-high">
            Set GEMINI_API_KEY in .env.local to enable AI features.
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] text-sm px-3 py-2 rounded-md leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-inverse-surface text-on-inverse-surface'
                    : 'bg-surface-container-low text-on-surface'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface-container-low px-3 py-2 rounded-md text-on-surface-variant text-sm flex items-center gap-2">
                <RefreshCw size={12} className="animate-spin" /> Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-3 border-t border-surface-container-high flex gap-2">
          <input
            className="input-industrial flex-1 text-sm py-2"
            placeholder={hasKey ? 'Ask KAI anything...' : 'AI requires GEMINI_API_KEY'}
            value={input}
            disabled={!hasKey || loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button
            onClick={send}
            disabled={!hasKey || !input.trim() || loading}
            className="btn-primary px-3 py-2 disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Alerts Panel ─────────────────────────────────────────────────────────────

function AlertsPanel({
  onClose,
  setScreen,
}: {
  onClose: () => void;
  setScreen: (s: Screen) => void;
}) {
  const { state } = useApp();
  const alerts = state.inventory.filter((i) => i.status !== 'healthy');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-4 pr-20 pointer-events-none">
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        className="bg-surface-container-lowest rounded-md shadow-2xl w-80 overflow-hidden pointer-events-auto border border-surface-container-high"
      >
        <div className="flex justify-between items-center px-4 py-3 bg-surface-container-low border-b border-surface-container-high">
          <span className="font-bold text-sm">Stock Alerts ({alerts.length})</span>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-4">
              All stock levels are healthy.
            </p>
          ) : (
            alerts.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-surface-container-low rounded-md"
              >
                <div>
                  <div className="font-bold text-sm">{item.name}</div>
                  <div className="text-xs text-on-surface-variant">
                    {item.quantity} {item.unit} remaining
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))
          )}
        </div>
        <div className="px-4 pb-4">
          <button
            onClick={() => {
              setScreen('inventory');
              onClose();
            }}
            className="btn-primary w-full text-sm"
          >
            Manage Inventory
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const Sidebar = ({
  activeScreen,
  setScreen,
}: {
  activeScreen: Screen;
  setScreen: (s: Screen) => void;
}) => {
  const navItems = [
    { id: 'dashboard' as Screen, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'inventory' as Screen, icon: Package, label: 'Inventory' },
    { id: 'orders' as Screen, icon: ClipboardList, label: 'Orders' },
  ];

  return (
    <aside className="w-20 md:w-64 bg-surface-container-high h-screen flex flex-col transition-all duration-300 z-20 flex-shrink-0">
      <div className="p-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-inverse-surface rounded-md flex items-center justify-center text-on-inverse-surface font-display font-bold text-xl">
            K
          </div>
          <span className="hidden md:block font-display font-bold text-xl tracking-tight uppercase">
            Kinetic
          </span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            className={`w-full flex items-center gap-4 p-3 rounded-md transition-all ${
              activeScreen === item.id
                ? 'bg-surface-container-lowest text-primary shadow-ambient'
                : 'text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            <item.icon size={20} />
            <span className="hidden md:block font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto space-y-2">
        <button
          onClick={() => setScreen('settings')}
          className={`w-full flex items-center gap-4 p-3 rounded-md transition-all ${
            activeScreen === 'settings'
              ? 'bg-surface-container-lowest text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-highest'
          }`}
        >
          <Settings size={20} />
          <span className="hidden md:block font-medium">Settings</span>
        </button>
        <button
          onClick={() => {
            if (confirm('Reset all data to defaults?')) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="w-full flex items-center gap-4 p-3 text-error hover:bg-error/5 rounded-md transition-all"
        >
          <LogOut size={20} />
          <span className="hidden md:block font-medium">Reset Data</span>
        </button>
      </div>
    </aside>
  );
};

// ─── Quick Action Rail ────────────────────────────────────────────────────────

const QuickActionRail = ({
  onAdd,
  onAI,
  onAlert,
}: {
  onAdd: () => void;
  onAI: () => void;
  onAlert: () => void;
}) => {
  const { state } = useApp();
  const alerts = state.inventory.filter((i) => i.status !== 'healthy').length;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-16 bg-inverse-surface flex flex-col items-center py-8 gap-6 z-30">
      <button
        onClick={onAdd}
        className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg"
        title="Add new item/order"
      >
        <Plus size={24} />
      </button>
      <div className="w-px h-12 bg-on-inverse-surface/20" />
      <button
        onClick={onAI}
        className="text-on-inverse-surface/60 hover:text-white transition-colors"
        title="AI Assistant"
      >
        <Bot size={20} />
      </button>
      <button
        onClick={onAlert}
        className="relative text-on-inverse-surface/60 hover:text-white transition-colors"
        title="Stock alerts"
      >
        <AlertCircle size={20} />
        {alerts > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-error text-on-error text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {alerts}
          </span>
        )}
      </button>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { state } = useApp();
  const activeOrders = state.orders.filter((o) => o.status !== 'served');
  const stockAlerts = state.inventory.filter((i) => i.status !== 'healthy');
  const criticalCount = stockAlerts.filter((i) => i.status === 'critical').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <header>
        <p className="text-on-surface-variant text-sm font-medium uppercase tracking-widest mb-2">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h1 className="text-5xl font-bold">Kitchen Pulse</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            label: 'Active Orders',
            value: activeOrders.length.toString().padStart(2, '0'),
            sub: `${activeOrders.filter((o) => o.status === 'pending').length} pending`,
            icon: ClipboardList,
            color: 'text-primary',
          },
          {
            label: 'Stock Alerts',
            value: stockAlerts.length.toString().padStart(2, '0'),
            sub: `${criticalCount} critical item${criticalCount !== 1 ? 's' : ''}`,
            icon: AlertCircle,
            color: 'text-error',
          },
          {
            label: 'Items in Stock',
            value: state.inventory.length.toString().padStart(2, '0'),
            sub: `${state.inventory.filter((i) => i.status === 'healthy').length} healthy`,
            icon: TrendingUp,
            color: 'text-emerald-700',
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-surface-container-lowest p-8 rounded-md shadow-ambient border-l-4 border-primary"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-tighter">
                {stat.label}
              </span>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div className="text-6xl font-display font-bold mb-2">{stat.value}</div>
            <p className="text-on-surface-variant text-sm">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section className="bg-surface-container-low p-8 rounded-md">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Recent Orders</h2>
            <button onClick={() => setScreen('orders')} className="btn-tertiary text-sm">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {activeOrders.slice(0, 3).map((order) => (
              <div
                key={order.id}
                className="bg-surface-container-lowest p-6 rounded-md flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-display font-bold text-lg">{order.table}</span>
                    <span className="text-xs text-on-surface-variant font-mono">{order.id}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    {order.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold mb-1">{order.time}</div>
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
            ))}
            {activeOrders.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center py-8">
                No active orders
              </p>
            )}
          </div>
        </section>

        <section className="bg-surface-container-low p-8 rounded-md">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Inventory Watch</h2>
            <button onClick={() => setScreen('inventory')} className="btn-tertiary text-sm">
              Manage
            </button>
          </div>
          <div className="space-y-4">
            {state.inventory.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="bg-surface-container-lowest p-6 rounded-md flex justify-between items-center"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-2 h-12 rounded-full ${
                      item.status === 'healthy'
                        ? 'bg-emerald-500'
                        : item.status === 'warning'
                        ? 'bg-primary-container'
                        : 'bg-error'
                    }`}
                  />
                  <div>
                    <h3 className="font-bold">{item.name}</h3>
                    <p className="text-xs text-on-surface-variant">{item.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-xl">
                    {item.quantity}{' '}
                    <span className="text-sm text-on-surface-variant font-normal">
                      {item.unit}
                    </span>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

// ─── Inventory Screen ─────────────────────────────────────────────────────────

function Inventory({ onAdd }: { onAdd: () => void }) {
  const { state, dispatch } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(state.inventory.map((i) => i.category))).sort()],
    [state.inventory]
  );

  const filtered = useMemo(
    () =>
      state.inventory.filter((item) => {
        const matchSearch =
          !search ||
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.category.toLowerCase().includes(search.toLowerCase());
        const matchCat = category === 'All' || item.category === category;
        return matchSearch && matchCat;
      }),
    [state.inventory, search, category]
  );

  function startEdit(item: InventoryItem) {
    setEditItem(item);
    setShowEdit(true);
  }

  function deleteItem(id: string) {
    if (confirm('Delete this item?')) dispatch({ type: 'DELETE_INVENTORY', id });
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <AnimatePresence>
        {showEdit && (
          <InventoryModal
            item={editItem}
            onClose={() => {
              setShowEdit(false);
              setEditItem(null);
            }}
          />
        )}
      </AnimatePresence>

      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-bold mb-2">Inventory</h1>
          <p className="text-on-surface-variant">Manage your stock levels and supply chain.</p>
        </div>
        <button onClick={onAdd} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> New Entry
        </button>
      </header>

      <div className="bg-surface-container-lowest rounded-md shadow-ambient overflow-hidden">
        <div className="p-6 bg-surface-container-low flex gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              size={18}
            />
            <input
              type="text"
              placeholder="Search items, categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-lowest pl-10 pr-4 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
          </div>
          <select
            className="bg-surface-container-lowest px-4 py-2 rounded-md text-sm focus:outline-none"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              <th className="px-6 py-4">Item Details</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Stock Level</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Last Sync</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-high">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-surface transition-colors group">
                <td className="px-6 py-5">
                  <div className="font-bold text-on-surface">{item.name}</div>
                  <div className="text-xs text-on-surface-variant font-mono">SKU-{item.id}</div>
                </td>
                <td className="px-6 py-5 text-sm text-on-surface-variant">{item.category}</td>
                <td className="px-6 py-5">
                  <div className="font-display font-bold text-lg">
                    {item.quantity} {item.unit}
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    min: {item.minThreshold} {item.unit}
                  </div>
                </td>
                <td className="px-6 py-5">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-6 py-5 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-1">
                    <Clock size={12} /> {timeAgo(item.lastUpdated)}
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(item)}
                      className="p-2 hover:bg-surface-container-highest rounded-md transition-colors text-on-surface-variant"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-2 hover:bg-error/10 rounded-md transition-colors text-error"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                  No items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

// ─── Orders Screen ────────────────────────────────────────────────────────────

const STATUS_FLOW: Record<Order['status'], Order['status'] | null> = {
  pending: 'preparing',
  preparing: 'ready',
  ready: 'served',
  served: null,
};

const STATUS_LABEL: Record<Order['status'], string> = {
  pending: 'Start Prep',
  preparing: 'Mark Ready',
  ready: 'Serve',
  served: 'Done',
};

function Orders({ onAdd }: { onAdd: () => void }) {
  const { state, dispatch } = useApp();
  const [filter, setFilter] = useState<Order['status'] | 'all'>('all');
  const [showHistory, setShowHistory] = useState(false);

  const active = state.orders.filter((o) => o.status !== 'served');
  const history = state.orders.filter((o) => o.status === 'served');
  const displayed = showHistory
    ? history
    : filter === 'all'
    ? active
    : active.filter((o) => o.status === filter);

  function advance(id: string, status: Order['status']) {
    const next = STATUS_FLOW[status];
    if (next) dispatch({ type: 'UPDATE_ORDER_STATUS', id, status: next });
  }

  function voidOrder(id: string) {
    if (confirm('Void this order?')) dispatch({ type: 'DELETE_ORDER', id });
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-bold mb-2">Orders</h1>
          <p className="text-on-surface-variant">Real-time kitchen display system.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={showHistory ? 'btn-primary' : 'btn-secondary'}
          >
            {showHistory ? 'Live Orders' : 'History'}
          </button>
          {!showHistory && (
            <button onClick={onAdd} className="btn-primary">
              New Order
            </button>
          )}
        </div>
      </header>

      {!showHistory && (
        <div className="flex gap-2">
          {(['all', 'pending', 'preparing', 'ready'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-inverse-surface text-on-inverse-surface'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              {f === 'all'
                ? `All (${active.length})`
                : `${f} (${active.filter((o) => o.status === f).length})`}
            </button>
          ))}
        </div>
      )}

      {showHistory && (
        <div className="bg-surface-container-low p-4 rounded-md">
          <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Served Orders ({history.length})
          </h3>
          {history.length === 0 ? (
            <p className="text-on-surface-variant text-sm">No served orders yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((o) => (
                <div
                  key={o.id}
                  className="bg-surface-container-lowest px-4 py-3 rounded flex justify-between items-center text-sm gap-4"
                >
                  <span className="font-bold">{o.table}</span>
                  <span className="text-on-surface-variant font-mono text-xs">{o.id}</span>
                  <span className="text-on-surface-variant flex-1 truncate">
                    {o.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                  </span>
                  <span className="text-on-surface-variant">{o.time}</span>
                  <button
                    onClick={() => dispatch({ type: 'DELETE_ORDER', id: o.id })}
                    className="text-error hover:bg-error/10 p-1 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!showHistory && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayed.map((order) => (
            <div
              key={order.id}
              className="bg-surface-container-lowest rounded-md shadow-ambient flex flex-col"
            >
              <div
                className={`h-1.5 w-full rounded-t-md ${
                  order.status === 'pending'
                    ? 'bg-primary-container'
                    : order.status === 'preparing'
                    ? 'bg-primary'
                    : 'bg-emerald-500'
                }`}
              />
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-3xl font-display font-bold">{order.table}</h3>
                    <span className="text-xs text-on-surface-variant font-mono">{order.id}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{order.time}</div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </div>

                <div className="space-y-3 mb-8 flex-1">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
                        {item.quantity}
                      </div>
                      <span className="text-on-surface font-medium">{item.name}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-6 border-t border-surface-container-high flex gap-3">
                  <button
                    onClick={() => voidOrder(order.id)}
                    className="flex-1 btn-secondary text-xs py-2 flex items-center justify-center gap-1"
                  >
                    <Trash2 size={12} /> Void
                  </button>
                  <button
                    onClick={() => advance(order.id, order.status)}
                    disabled={STATUS_FLOW[order.status] === null}
                    className="flex-[2] btn-primary text-xs py-2 disabled:opacity-50"
                  >
                    {STATUS_LABEL[order.status]}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {displayed.length === 0 && (
            <div className="col-span-3 text-center py-16 text-on-surface-variant">
              No {filter === 'all' ? 'active' : filter} orders.
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

function SettingsScreen() {
  const hasKey = !!process.env.GEMINI_API_KEY;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-2xl"
    >
      <header>
        <h1 className="text-5xl font-bold mb-2">Settings</h1>
        <p className="text-on-surface-variant">Manage your Kinetic Kitchen configuration.</p>
      </header>

      <div className="bg-surface-container-lowest rounded-md shadow-ambient divide-y divide-surface-container-high">
        <div className="p-6">
          <h2 className="font-bold mb-1">AI Integration</h2>
          <p className="text-sm text-on-surface-variant mb-3">
            Connect your Gemini API key to enable KAI assistant features.
          </p>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${hasKey ? 'bg-emerald-500' : 'bg-error'}`} />
            <span className="text-sm font-medium">
              {hasKey
                ? 'GEMINI_API_KEY detected — AI features active'
                : 'GEMINI_API_KEY not set'}
            </span>
          </div>
          {!hasKey && (
            <div className="mt-3 bg-surface-container-low rounded-md p-4 text-sm font-mono text-on-surface-variant">
              1. Create .env.local in project root
              <br />
              2. Add: GEMINI_API_KEY=your_key_here
              <br />
              3. Restart the dev server
            </div>
          )}
        </div>

        <div className="p-6">
          <h2 className="font-bold mb-1">Data Storage</h2>
          <p className="text-sm text-on-surface-variant mb-3">
            All data is stored locally in your browser's localStorage.
          </p>
          <button
            onClick={() => {
              if (confirm('Clear all data and reset to defaults?')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="btn-secondary text-sm text-error"
          >
            Clear All Data
          </button>
        </div>

        <div className="p-6">
          <h2 className="font-bold mb-1">About</h2>
          <p className="text-sm text-on-surface-variant">
            Kinetic Kitchen v1.0 — Restaurant management powered by React 19 + Gemini AI.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function AppInner() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  function handleAdd() {
    if (screen === 'orders') setShowAddOrder(true);
    else setShowAddInventory(true);
  }

  return (
    <div className="flex h-screen bg-surface overflow-hidden text-on-surface selection:bg-primary/20">
      <Sidebar activeScreen={screen} setScreen={setScreen} />

      <main className="flex-1 overflow-y-auto relative pr-16">
        <div className="max-w-7xl mx-auto px-8 md:px-20 py-16">
          {screen === 'dashboard' && <Dashboard setScreen={setScreen} />}
          {screen === 'inventory' && <Inventory onAdd={() => setShowAddInventory(true)} />}
          {screen === 'orders' && <Orders onAdd={() => setShowAddOrder(true)} />}
          {screen === 'settings' && <SettingsScreen />}
        </div>
      </main>

      <QuickActionRail
        onAdd={handleAdd}
        onAI={() => setShowAI((v) => !v)}
        onAlert={() => setShowAlerts((v) => !v)}
      />

      <AnimatePresence>
        {showAddInventory && (
          <InventoryModal item={null} onClose={() => setShowAddInventory(false)} />
        )}
        {showAddOrder && <OrderModal onClose={() => setShowAddOrder(false)} />}
        {showAI && <AIAssistant onClose={() => setShowAI(false)} />}
        {showAlerts && (
          <AlertsPanel onClose={() => setShowAlerts(false)} setScreen={setScreen} />
        )}
      </AnimatePresence>

      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-primary/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-secondary-container/10 blur-[120px] pointer-events-none rounded-full" />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
