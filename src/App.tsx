import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  LogOut,
  Plus,
  Search,
  ChevronLeft,
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
  ShoppingCart,
  CheckCircle2,
  Banknote,
  Minus,
  LogIn,
  Lock,
  KeyRound,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useApp } from './context';
import { askAI, getReorderSuggestions } from './ai';
import type { Screen, InventoryItem, StaffMember } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────


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
    parLevel: item?.parLevel?.toString() ?? '',
  });

  function handleSave() {
    if (!form.name.trim() || !form.quantity || !form.minThreshold) return;
    const qty = parseFloat(form.quantity);
    const threshold = parseFloat(form.minThreshold);
    const parLevel = form.parLevel ? parseFloat(form.parLevel) : threshold * 2;
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
          parLevel,
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
          parLevel,
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
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">
            Par Level <span className="font-normal normal-case">(restock target — leave blank to auto-set)</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            className="input-industrial w-full"
            placeholder={form.minThreshold ? `e.g. ${parseFloat(form.minThreshold || '0') * 2}` : 'e.g. 10'}
            value={form.parLevel}
            onChange={(e) => setForm((f) => ({ ...f, parLevel: e.target.value }))}
          />
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
      const reply = await askAI(userMsg, state.inventory, []);
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

// ─── Staff Modal ──────────────────────────────────────────────────────────────

const ROLES = ['Head Chef', 'Sous Chef', 'Chef', 'Waiter', 'Bartender', 'Cashier', 'Manager', 'Cleaner', 'Other'];

function StaffModal({ member, onClose }: { member: StaffMember | null; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({
    name: member?.name ?? '',
    role: member?.role ?? 'Waiter',
    hourlyRate: member?.hourlyRate?.toString() ?? '',
    pin: member?.pin ?? '',
  });
  const [pinError, setPinError] = useState('');

  function handleSave() {
    if (!form.name.trim() || !form.hourlyRate || !form.pin) return;
    const rate = parseFloat(form.hourlyRate);
    if (isNaN(rate) || rate < 0) return;
    if (!/^\d{4}$/.test(form.pin)) { setPinError('PIN must be exactly 4 digits'); return; }
    const duplicate = state.staff.find((s) => s.pin === form.pin && s.id !== member?.id);
    if (duplicate) { setPinError(`PIN already used by ${duplicate.name}`); return; }
    if (member) {
      dispatch({ type: 'UPDATE_STAFF', member: { ...member, name: form.name.trim(), role: form.role, hourlyRate: rate, pin: form.pin } });
    } else {
      dispatch({ type: 'ADD_STAFF', member: { id: newId('STF'), name: form.name.trim(), role: form.role, hourlyRate: rate, pin: form.pin } });
    }
    onClose();
  }

  return (
    <Modal title={member ? 'Edit Staff' : 'Add Staff'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">Name</label>
          <input
            className="input-industrial w-full"
            placeholder="e.g. Alice Chen"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">Role</label>
          <select
            className="input-industrial w-full"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">Hourly Rate ($)</label>
          <input
            type="number"
            min="0"
            step="0.5"
            className="input-industrial w-full"
            placeholder="e.g. 15"
            value={form.hourlyRate}
            onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">
            Kiosk PIN <span className="font-normal normal-case">(4 digits — staff use this to clock in)</span>
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            className="input-industrial w-full tracking-widest text-xl"
            placeholder="••••"
            value={form.pin}
            onChange={(e) => {
              setPinError('');
              setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }));
            }}
          />
          {pinError && <p className="text-xs text-error mt-1">{pinError}</p>}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={handleSave}
            className="btn-primary flex-1"
            disabled={!form.name.trim() || !form.hourlyRate || form.pin.length !== 4}
          >
            {member ? 'Save Changes' : 'Add Staff'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Restock Screen ───────────────────────────────────────────────────────────

function RestockScreen({ onAdd }: { onAdd: () => void }) {
  const { state, dispatch } = useApp();
  const [filter, setFilter] = useState<'urgent' | 'all'>('urgent');
  const [quickEdit, setQuickEdit] = useState<{ id: string; value: string } | null>(null);

  const urgent = state.inventory.filter((i) => i.status !== 'healthy');
  const displayed = filter === 'urgent' ? urgent : [...state.inventory];
  const sorted = [...displayed].sort((a, b) => {
    const order = { critical: 0, warning: 1, healthy: 2 };
    return order[a.status] - order[b.status];
  });

  function setToPar(item: InventoryItem) {
    dispatch({ type: 'UPDATE_INVENTORY', item: { ...item, quantity: item.parLevel } });
  }

  function saveQuickEdit(item: InventoryItem) {
    if (!quickEdit || quickEdit.id !== item.id) return;
    const qty = parseFloat(quickEdit.value);
    if (!isNaN(qty) && qty >= 0) {
      dispatch({ type: 'UPDATE_INVENTORY', item: { ...item, quantity: qty } });
    }
    setQuickEdit(null);
  }

  const criticalCount = state.inventory.filter((i) => i.status === 'critical').length;
  const warningCount = state.inventory.filter((i) => i.status === 'warning').length;
  const healthyCount = state.inventory.filter((i) => i.status === 'healthy').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header className="flex justify-between items-end">
        <div>
          <p className="text-on-surface-variant text-sm font-medium uppercase tracking-widest mb-2">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <h1 className="text-5xl font-bold mb-2">Restock</h1>
          <p className="text-on-surface-variant">
            {urgent.length === 0
              ? 'All items are well stocked.'
              : `${urgent.length} item${urgent.length !== 1 ? 's' : ''} need${urgent.length === 1 ? 's' : ''} restocking`}
          </p>
        </div>
        <button onClick={onAdd} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Item
        </button>
      </header>

      {/* Stock summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest rounded-md p-5 border-l-4 border-error">
          <div className="text-3xl font-display font-bold text-error">{criticalCount}</div>
          <div className="text-xs text-on-surface-variant uppercase tracking-wider mt-1">Critical</div>
        </div>
        <div className="bg-surface-container-lowest rounded-md p-5 border-l-4 border-primary-container">
          <div className="text-3xl font-display font-bold text-primary">{warningCount}</div>
          <div className="text-xs text-on-surface-variant uppercase tracking-wider mt-1">Low Stock</div>
        </div>
        <div className="bg-surface-container-lowest rounded-md p-5 border-l-4 border-emerald-500">
          <div className="text-3xl font-display font-bold text-emerald-700">{healthyCount}</div>
          <div className="text-xs text-on-surface-variant uppercase tracking-wider mt-1">Healthy</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['urgent', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              filter === f
                ? 'bg-inverse-surface text-on-inverse-surface'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            {f === 'urgent'
              ? `Needs Restock (${urgent.length})`
              : `All Items (${state.inventory.length})`}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-md">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500 opacity-60" />
            <p className="font-bold text-lg">All stocked up!</p>
            <p className="text-sm mt-1">No items currently need restocking.</p>
          </div>
        ) : (
          sorted.map((item) => {
            const needToBuy = Math.max(0, item.parLevel - item.quantity);
            const isEditing = quickEdit?.id === item.id;
            return (
              <div
                key={item.id}
                className={`bg-surface-container-lowest rounded-md p-5 flex items-center gap-4 border-l-4 ${
                  item.status === 'critical'
                    ? 'border-error'
                    : item.status === 'warning'
                    ? 'border-primary-container'
                    : 'border-emerald-500'
                }`}
              >
                {/* Name + category */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-on-surface">{item.name}</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">{item.category}</div>
                </div>

                {/* Current qty — tap to edit inline */}
                <div className="text-center min-w-[90px]">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Have</div>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        autoFocus
                        className="input-industrial w-16 text-center text-sm py-1"
                        value={quickEdit.value}
                        onChange={(e) =>
                          setQuickEdit({ id: item.id, value: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveQuickEdit(item);
                          if (e.key === 'Escape') setQuickEdit(null);
                        }}
                      />
                      <button
                        onClick={() => saveQuickEdit(item)}
                        className="text-emerald-600 hover:text-emerald-700 p-1"
                        title="Save"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        setQuickEdit({ id: item.id, value: item.quantity.toString() })
                      }
                      className="font-display font-bold text-xl hover:text-primary transition-colors"
                      title="Tap to update quantity"
                    >
                      {item.quantity}{' '}
                      <span className="text-xs font-normal text-on-surface-variant">
                        {item.unit}
                      </span>
                    </button>
                  )}
                </div>

                {/* Need to buy */}
                <div className="text-center min-w-[90px]">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Buy</div>
                  <div
                    className={`font-display font-bold text-xl ${
                      needToBuy > 0
                        ? item.status === 'critical'
                          ? 'text-error'
                          : 'text-primary'
                        : 'text-emerald-600'
                    }`}
                  >
                    {needToBuy > 0 ? needToBuy : '✓'}{' '}
                    {needToBuy > 0 && (
                      <span className="text-xs font-normal text-on-surface-variant">
                        {item.unit}
                      </span>
                    )}
                  </div>
                </div>

                {/* Par level */}
                <div className="text-center min-w-[70px] hidden sm:block">
                  <div className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Par</div>
                  <div className="text-sm font-medium">
                    {item.parLevel} {item.unit}
                  </div>
                </div>

                {/* Restocked button — only for non-healthy */}
                {item.status !== 'healthy' && (
                  <button
                    onClick={() => setToPar(item)}
                    className="btn-primary text-xs py-2 px-3 whitespace-nowrap"
                    title={`Set to par: ${item.parLevel} ${item.unit}`}
                  >
                    Restocked ✓
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// ─── Manager Login Modal ──────────────────────────────────────────────────────

function ManagerLoginModal({ onClose, onUnlock }: { onClose: () => void; onUnlock: () => void }) {
  const { state } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    if (pin === state.managerPin) {
      onUnlock();
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-surface-container-lowest rounded-md shadow-2xl w-full max-w-xs mx-4 p-8 flex flex-col items-center gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-inverse-surface flex items-center justify-center">
          <KeyRound size={22} className="text-on-inverse-surface" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">Manager Login</h2>
          <p className="text-sm text-on-surface-variant mt-1">Enter your manager PIN</p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          autoFocus
          className="input-industrial w-full text-center text-3xl tracking-[0.5em] py-3"
          placeholder="••••"
          value={pin}
          onChange={(e) => {
            setError('');
            setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        {error && <p className="text-sm text-error -mt-2">{error}</p>}
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary flex-1" disabled={pin.length !== 4}>
            Unlock
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Kiosk Screen ─────────────────────────────────────────────────────────────

function KioskScreen({ onManagerTap }: { onManagerTap?: () => void }) {
  const { state, dispatch } = useApp();
  const [pin, setPin] = useState('');
  const [found, setFound] = useState<StaffMember | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [tick, setTick] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-lookup once 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && !found && !message) {
      const match = state.staff.find((s) => s.pin === pin);
      if (match) {
        setFound(match);
      } else {
        setMessage({ text: 'PIN not recognised. Try again.', ok: false });
        setTimeout(() => { setPin(''); setMessage(null); }, 2000);
      }
    }
  }, [pin]);

  const today = toDateStr(tick);
  const todayRecord = found
    ? state.attendance.find((a) => a.staffId === found.id && a.date === today)
    : null;
  const clockedIn = !!todayRecord?.clockIn && !todayRecord?.clockOut;

  function handleAction() {
    if (!found) return;
    const now = new Date();
    const ts = now.toISOString();
    const date = toDateStr(now);
    if (clockedIn) {
      dispatch({ type: 'CLOCK_OUT', staffId: found.id, date, timestamp: ts });
      const ms = todayRecord?.clockIn
        ? now.getTime() - new Date(todayRecord.clockIn).getTime()
        : 0;
      const hrs = (ms / 3600000).toFixed(1);
      setMessage({ text: `Clocked out ✓ — ${hrs} hrs worked today`, ok: true });
    } else {
      dispatch({ type: 'CLOCK_IN', staffId: found.id, date, timestamp: ts });
      setMessage({ text: 'Clocked in ✓ — Have a great shift!', ok: true });
    }
    setTimeout(reset, 3000);
  }

  function reset() {
    setPin('');
    setFound(null);
    setMessage(null);
  }

  function numpadPress(val: string) {
    if (found || message) return;
    if (val === 'C') { setPin(''); return; }
    if (val === '←') { setPin((p) => p.slice(0, -1)); return; }
    if (pin.length < 4) setPin((p) => p + val);
  }

  const numpadKeys = ['1','2','3','4','5','6','7','8','9','C','0','←'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col items-center justify-center min-h-[80vh] gap-8 select-none"
    >
      {/* Live clock */}
      <div className="text-center">
        <div className="text-7xl font-display font-bold tracking-tight">
          {tick.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </div>
        <div className="text-on-surface-variant text-sm mt-1">
          {tick.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Staff info after PIN matched */}
      {found && !message && (
        <div className="text-center">
          <div className="text-3xl font-bold">{found.name}</div>
          <div className="text-on-surface-variant mt-1">{found.role}</div>
          {clockedIn && todayRecord?.clockIn && (
            <div className="text-sm text-on-surface-variant mt-2">
              Clocked in at{' '}
              {new Date(todayRecord.clockIn).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', hour12: false,
              })}
            </div>
          )}
        </div>
      )}

      {/* Feedback message */}
      {message && (
        <div
          className={`text-center px-10 py-5 rounded-md text-xl font-bold ${
            message.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-error/10 text-error'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* PIN dots */}
      {!found && !message && (
        <div className="text-center">
          <div className="text-xs text-on-surface-variant uppercase tracking-widest mb-4">
            Enter your PIN
          </div>
          <div className="flex gap-4 justify-center">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  i < pin.length
                    ? 'bg-primary border-primary scale-110'
                    : 'border-on-surface-variant'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Clock In / Out button */}
      {found && !message && (
        <div className="flex gap-4">
          <button onClick={reset} className="btn-secondary px-8 py-4 text-lg">
            Cancel
          </button>
          <button
            onClick={handleAction}
            className={`px-10 py-4 rounded-md text-lg font-bold transition-all shadow-lg ${
              clockedIn
                ? 'bg-error text-on-error hover:bg-error/90'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {clockedIn ? 'Clock Out' : 'Clock In'}
          </button>
        </div>
      )}

      {/* Numpad */}
      {!found && !message && (
        <div className="grid grid-cols-3 gap-3 w-60">
          {numpadKeys.map((k) => (
            <button
              key={k}
              onClick={() => numpadPress(k)}
              className={`h-16 rounded-md text-xl font-bold transition-all active:scale-95 ${
                k === 'C'
                  ? 'bg-error/10 text-error hover:bg-error/20'
                  : k === '←'
                  ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                  : 'bg-surface-container-lowest shadow-ambient hover:bg-surface text-on-surface'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      {state.staff.length === 0 && (
        <p className="text-sm text-on-surface-variant">
          Add staff members and assign PINs in the Attendance screen first.
        </p>
      )}

      {/* Subtle manager button — not obvious to staff */}
      {onManagerTap && (
        <button
          onClick={onManagerTap}
          className="absolute bottom-6 right-6 text-on-surface-variant/30 hover:text-on-surface-variant/60 transition-colors text-xs flex items-center gap-1"
        >
          <Lock size={12} /> Manager
        </button>
      )}
    </motion.div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const Sidebar = ({
  activeScreen,
  setScreen,
  onLock,
}: {
  activeScreen: Screen;
  setScreen: (s: Screen) => void;
  onLock: () => void;
}) => {
  const navItems = [
    { id: 'dashboard' as Screen, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'kiosk' as Screen, icon: LogIn, label: 'Clock In/Out' },
    { id: 'restock' as Screen, icon: ShoppingCart, label: 'Restock' },
    { id: 'inventory' as Screen, icon: Package, label: 'Inventory' },
    { id: 'attendance' as Screen, icon: Users, label: 'Attendance' },
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
          onClick={onLock}
          className="w-full flex items-center gap-4 p-3 text-on-surface-variant hover:bg-surface-container-highest rounded-md transition-all"
        >
          <Lock size={20} />
          <span className="hidden md:block font-medium">Lock</span>
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
  const today = toDateStr(new Date());
  const stockAlerts = state.inventory.filter((i) => i.status !== 'healthy');
  const criticalCount = stockAlerts.filter((i) => i.status === 'critical').length;
  const presentToday = state.attendance.filter((a) => a.date === today && a.hoursWorked > 0);

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
        <h1 className="text-5xl font-bold">Overview</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            label: 'Staff Today',
            value: presentToday.length.toString().padStart(2, '0'),
            sub: `of ${state.staff.length} staff members`,
            icon: Users,
            color: 'text-primary',
            screen: 'attendance' as Screen,
          },
          {
            label: 'Stock Alerts',
            value: stockAlerts.length.toString().padStart(2, '0'),
            sub: `${criticalCount} critical item${criticalCount !== 1 ? 's' : ''}`,
            icon: AlertCircle,
            color: 'text-error',
            screen: 'restock' as Screen,
          },
          {
            label: 'Items in Stock',
            value: state.inventory.length.toString().padStart(2, '0'),
            sub: `${state.inventory.filter((i) => i.status === 'healthy').length} healthy`,
            icon: TrendingUp,
            color: 'text-emerald-700',
            screen: 'inventory' as Screen,
          },
        ].map((stat, i) => (
          <button
            key={i}
            onClick={() => setScreen(stat.screen)}
            className="bg-surface-container-lowest p-8 rounded-md shadow-ambient border-l-4 border-primary text-left hover:bg-surface transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-tighter">
                {stat.label}
              </span>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div className="text-6xl font-display font-bold mb-2">{stat.value}</div>
            <p className="text-on-surface-variant text-sm">{stat.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Today's attendance */}
        <section className="bg-surface-container-low p-8 rounded-md">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Today's Staff</h2>
            <button onClick={() => setScreen('attendance')} className="btn-tertiary text-sm">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {state.staff.slice(0, 4).map((member) => {
              const record = state.attendance.find((a) => a.staffId === member.id && a.date === today);
              const hours = record?.hoursWorked ?? 0;
              return (
                <div key={member.id} className="bg-surface-container-lowest p-4 rounded-md flex justify-between items-center">
                  <div>
                    <div className="font-bold">{member.name}</div>
                    <div className="text-xs text-on-surface-variant">{member.role}</div>
                  </div>
                  <div className="text-right">
                    {hours > 0 ? (
                      <>
                        <div className="text-xs font-bold text-emerald-600">Present</div>
                        <div className="text-sm">{hours} hrs</div>
                      </>
                    ) : (
                      <div className="text-xs text-on-surface-variant">Not marked</div>
                    )}
                  </div>
                </div>
              );
            })}
            {state.staff.length === 0 && (
              <p className="text-on-surface-variant text-sm text-center py-8">No staff added yet.</p>
            )}
          </div>
        </section>

        {/* Inventory watch */}
        <section className="bg-surface-container-low p-8 rounded-md">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Inventory Watch</h2>
            <button onClick={() => setScreen('restock')} className="btn-tertiary text-sm">
              Restock
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
                  <div className="flex items-center justify-end gap-1">
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

// ─── Attendance Screen ────────────────────────────────────────────────────────

function toDateStr(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`; // YYYY-MM-DD in local time
}

function AttendanceScreen({ onAddStaff }: { onAddStaff: () => void }) {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<'daily' | 'salary'>('daily');
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [salaryMonth, setSalaryMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);

  // Navigate date
  function shiftDate(days: number) {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(toDateStr(d));
  }

  // Get hours worked for a staff member on the selected date
  function getHours(staffId: string): number {
    return state.attendance.find((a) => a.staffId === staffId && a.date === selectedDate)?.hoursWorked ?? 0;
  }

  // Update hours for a staff member (preserve clock timestamps)
  function setHours(staffId: string, hours: number) {
    const h = Math.max(0, Math.round(hours * 2) / 2); // round to 0.5
    const existing = state.attendance.find((a) => a.staffId === staffId && a.date === selectedDate);
    dispatch({
      type: 'SET_ATTENDANCE',
      record: {
        id: `${staffId}-${selectedDate}`,
        staffId,
        date: selectedDate,
        hoursWorked: h,
        clockIn: existing?.clockIn,
        clockOut: existing?.clockOut,
      },
    });
  }

  // Salary summary for selected month
  const salaryData = useMemo(() => {
    return state.staff.map((member) => {
      const records = state.attendance.filter(
        (a) => a.staffId === member.id && a.date.startsWith(salaryMonth) && a.hoursWorked > 0
      );
      const totalHours = records.reduce((sum, r) => sum + r.hoursWorked, 0);
      const daysPresent = records.length;
      const totalPay = totalHours * member.hourlyRate;
      return { member, totalHours, daysPresent, totalPay };
    });
  }, [state.staff, state.attendance, salaryMonth]);

  const grandTotal = salaryData.reduce((sum, r) => sum + r.totalPay, 0);

  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {showStaffModal && (
        <AnimatePresence>
          <StaffModal
            member={editStaff}
            onClose={() => { setShowStaffModal(false); setEditStaff(null); }}
          />
        </AnimatePresence>
      )}

      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-bold mb-2">Attendance</h1>
          <p className="text-on-surface-variant">{state.staff.length} staff members</p>
        </div>
        <button
          onClick={() => { setEditStaff(null); setShowStaffModal(true); onAddStaff(); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Add Staff
        </button>
      </header>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['daily', 'salary'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
              tab === t
                ? 'bg-inverse-surface text-on-inverse-surface'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
            }`}
          >
            {t === 'daily' ? 'Daily Attendance' : 'Salary Report'}
          </button>
        ))}
      </div>

      {/* ── Daily Attendance ── */}
      {tab === 'daily' && (
        <div className="space-y-6">
          {/* Date navigator */}
          <div className="flex items-center gap-4 bg-surface-container-lowest rounded-md px-6 py-4">
            <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-surface-container-high rounded-md transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="flex-1 text-center">
              <div className="font-bold text-lg">{displayDate}</div>
              <div className="text-xs text-on-surface-variant font-mono">{selectedDate}</div>
            </div>
            <button
              onClick={() => shiftDate(1)}
              disabled={selectedDate >= toDateStr(new Date())}
              className="p-2 hover:bg-surface-container-high rounded-md transition-colors disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {state.staff.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-md">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">No staff yet</p>
              <p className="text-sm mt-1">Add staff members to start tracking attendance.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {state.staff.map((member) => {
                const hours = getHours(member.id);
                const present = hours > 0;
                const record = state.attendance.find((a) => a.staffId === member.id && a.date === selectedDate);
                const fmtTime = (ts?: string) =>
                  ts ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : null;
                return (
                  <div
                    key={member.id}
                    className={`bg-surface-container-lowest rounded-md p-5 flex items-center gap-4 border-l-4 ${
                      present ? 'border-emerald-500' : 'border-surface-container-high'
                    }`}
                  >
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold">{member.name}</div>
                      <div className="text-xs text-on-surface-variant">{member.role} · ${member.hourlyRate}/hr</div>
                    </div>

                    {/* Hours stepper */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setHours(member.id, hours - 0.5)}
                        disabled={hours <= 0}
                        className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors disabled:opacity-30"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="text-center w-16">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={hours}
                          onChange={(e) => setHours(member.id, parseFloat(e.target.value) || 0)}
                          className="input-industrial w-full text-center text-lg font-bold py-1"
                        />
                        <div className="text-[10px] text-on-surface-variant mt-0.5">hrs</div>
                      </div>
                      <button
                        onClick={() => setHours(member.id, hours + 0.5)}
                        className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center hover:bg-surface-container-highest transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Status + clock times + pay */}
                    <div className="text-right min-w-[100px]">
                      {present ? (
                        <>
                          <div className="text-xs font-bold text-emerald-600 uppercase">Present</div>
                          <div className="text-sm font-bold">${(hours * member.hourlyRate).toFixed(2)}</div>
                          {fmtTime(record?.clockIn) && (
                            <div className="text-[10px] text-on-surface-variant mt-0.5">
                              In {fmtTime(record?.clockIn)}
                              {fmtTime(record?.clockOut) ? ` · Out ${fmtTime(record?.clockOut)}` : ' · Still in'}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-bold text-on-surface-variant uppercase">Absent</div>
                          {fmtTime(record?.clockIn) && (
                            <div className="text-[10px] text-primary mt-0.5">
                              In {fmtTime(record?.clockIn)} · Still in
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Edit/delete staff */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditStaff(member); setShowStaffModal(true); }}
                        className="p-2 hover:bg-surface-container-highest rounded-md transition-colors text-on-surface-variant"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${member.name} and all their attendance records?`))
                            dispatch({ type: 'DELETE_STAFF', id: member.id });
                        }}
                        className="p-2 hover:bg-error/10 rounded-md transition-colors text-error"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Salary Report ── */}
      {tab === 'salary' && (
        <div className="space-y-6">
          {/* Month picker */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Month</label>
            <input
              type="month"
              value={salaryMonth}
              onChange={(e) => setSalaryMonth(e.target.value)}
              className="input-industrial"
            />
          </div>

          {state.staff.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-md">
              <Banknote size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">No staff yet</p>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-md shadow-ambient overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    <th className="px-6 py-4">Staff</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4 text-right">Days</th>
                    <th className="px-6 py-4 text-right">Hours</th>
                    <th className="px-6 py-4 text-right">Rate</th>
                    <th className="px-6 py-4 text-right">Total Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {salaryData.map(({ member, totalHours, daysPresent, totalPay }) => (
                    <tr key={member.id} className="hover:bg-surface transition-colors">
                      <td className="px-6 py-4 font-bold">{member.name}</td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">{member.role}</td>
                      <td className="px-6 py-4 text-right">{daysPresent}</td>
                      <td className="px-6 py-4 text-right">{totalHours}</td>
                      <td className="px-6 py-4 text-right text-sm text-on-surface-variant">${member.hourlyRate}/hr</td>
                      <td className="px-6 py-4 text-right font-display font-bold text-lg">
                        ${totalPay.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-inverse-surface text-on-inverse-surface">
                    <td colSpan={5} className="px-6 py-4 font-bold uppercase tracking-wider text-sm">
                      Total Payroll
                    </td>
                    <td className="px-6 py-4 text-right font-display font-bold text-2xl">
                      ${grandTotal.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────

function SettingsScreen() {
  const { state, dispatch } = useApp();
  const hasKey = !!process.env.GEMINI_API_KEY;
  const [pinForm, setPinForm] = useState({ current: '', next: '', confirm: '' });
  const [pinMsg, setPinMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function handleChangePIN() {
    if (pinForm.current !== state.managerPin) { setPinMsg({ text: 'Current PIN is incorrect', ok: false }); return; }
    if (!/^\d{4}$/.test(pinForm.next)) { setPinMsg({ text: 'New PIN must be exactly 4 digits', ok: false }); return; }
    if (pinForm.next !== pinForm.confirm) { setPinMsg({ text: 'New PINs do not match', ok: false }); return; }
    dispatch({ type: 'SET_MANAGER_PIN', pin: pinForm.next });
    setPinForm({ current: '', next: '', confirm: '' });
    setPinMsg({ text: 'Manager PIN updated', ok: true });
  }

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
          <h2 className="font-bold mb-1">Manager PIN</h2>
          <p className="text-sm text-on-surface-variant mb-4">
            Change the PIN used to unlock the management screens. Default is <code className="font-mono bg-surface-container-high px-1 rounded">0000</code>.
          </p>
          <div className="space-y-3 max-w-xs">
            {(['current', 'next', 'confirm'] as const).map((field) => (
              <div key={field}>
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">
                  {field === 'current' ? 'Current PIN' : field === 'next' ? 'New PIN' : 'Confirm New PIN'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className="input-industrial w-full tracking-widest text-xl"
                  placeholder="••••"
                  value={pinForm[field]}
                  onChange={(e) => {
                    setPinMsg(null);
                    setPinForm((f) => ({ ...f, [field]: e.target.value.replace(/\D/g, '').slice(0, 4) }));
                  }}
                />
              </div>
            ))}
            {pinMsg && (
              <p className={`text-sm ${pinMsg.ok ? 'text-emerald-600' : 'text-error'}`}>{pinMsg.text}</p>
            )}
            <button
              onClick={handleChangePIN}
              className="btn-primary text-sm"
              disabled={!pinForm.current || !pinForm.next || !pinForm.confirm}
            >
              Update PIN
            </button>
          </div>
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
  const [locked, setLocked] = useState(true);
  const [showManagerLogin, setShowManagerLogin] = useState(false);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  function handleAdd() {
    setShowAddInventory(true);
  }

  // Locked: only show kiosk
  if (locked) {
    return (
      <div className="h-screen bg-surface overflow-hidden text-on-surface relative">
        <div className="max-w-lg mx-auto px-8">
          <KioskScreen onManagerTap={() => setShowManagerLogin(true)} />
        </div>
        <AnimatePresence>
          {showManagerLogin && (
            <ManagerLoginModal
              onClose={() => setShowManagerLogin(false)}
              onUnlock={() => { setLocked(false); setShowManagerLogin(false); setScreen('dashboard'); }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }



  return (
    <div className="flex h-screen bg-surface overflow-hidden text-on-surface selection:bg-primary/20">
      <Sidebar activeScreen={screen} setScreen={setScreen} onLock={() => setLocked(true)} />

      <main className="flex-1 overflow-y-auto relative pr-16">
        <div className="max-w-7xl mx-auto px-8 md:px-20 py-16">
          {screen === 'dashboard' && <Dashboard setScreen={setScreen} />}
          {screen === 'kiosk' && <KioskScreen />}  {/* no manager tap in manager mode */}
          {screen === 'restock' && <RestockScreen onAdd={() => setShowAddInventory(true)} />}
          {screen === 'inventory' && <Inventory onAdd={() => setShowAddInventory(true)} />}
          {screen === 'attendance' && <AttendanceScreen onAddStaff={() => {}} />}
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
