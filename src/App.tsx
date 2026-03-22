import React from 'react';
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
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type Screen = 'dashboard' | 'inventory' | 'orders';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: string;
}

interface Order {
  id: string;
  table: string;
  items: string[];
  status: 'pending' | 'preparing' | 'ready';
  time: string;
}

// --- Mock Data ---

const MOCK_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Wagyu Ribeye', category: 'Proteins', quantity: 12, unit: 'kg', status: 'healthy', lastUpdated: '2h ago' },
  { id: '2', name: 'Truffle Oil', category: 'Pantry', quantity: 0.5, unit: 'L', status: 'critical', lastUpdated: '1h ago' },
  { id: '3', name: 'Heirloom Tomatoes', category: 'Produce', quantity: 5, unit: 'kg', status: 'warning', lastUpdated: '30m ago' },
  { id: '4', name: 'Heavy Cream', category: 'Dairy', quantity: 15, unit: 'L', status: 'healthy', lastUpdated: '4h ago' },
  { id: '5', name: 'Sea Salt', category: 'Pantry', quantity: 2, unit: 'kg', status: 'warning', lastUpdated: '1d ago' },
];

const MOCK_ORDERS: Order[] = [
  { id: 'ORD-1024', table: 'T-04', items: ['Wagyu Steak x2', 'Red Wine Jus'], status: 'preparing', time: '12:45' },
  { id: 'ORD-1025', table: 'T-12', items: ['Truffle Pasta', 'Burrata Salad'], status: 'pending', time: '12:50' },
  { id: 'ORD-1026', table: 'T-02', items: ['Roasted Chicken', 'Asparagus'], status: 'ready', time: '12:30' },
];

// --- Components ---

const Sidebar = ({ activeScreen, setScreen }: { activeScreen: Screen, setScreen: (s: Screen) => void }) => {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'inventory', icon: Package, label: 'Inventory' },
    { id: 'orders', icon: ClipboardList, label: 'Orders' },
  ];

  return (
    <aside className="w-20 md:w-64 bg-surface-container-high h-screen flex flex-col transition-all duration-300 z-20">
      <div className="p-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-inverse-surface rounded-md flex items-center justify-center text-on-inverse-surface font-display font-bold text-xl">
            K
          </div>
          <span className="hidden md:block font-display font-bold text-xl tracking-tight uppercase">Kinetic</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id as Screen)}
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
        <button className="w-full flex items-center gap-4 p-3 text-on-surface-variant hover:bg-surface-container-highest rounded-md transition-all">
          <Settings size={20} />
          <span className="hidden md:block font-medium">Settings</span>
        </button>
        <button className="w-full flex items-center gap-4 p-3 text-error hover:bg-error/5 rounded-md transition-all">
          <LogOut size={20} />
          <span className="hidden md:block font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

const QuickActionRail = () => {
  return (
    <div className="fixed right-0 top-0 bottom-0 w-16 bg-inverse-surface flex flex-col items-center py-8 gap-6 z-30">
      <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg">
        <Plus size={24} />
      </button>
      <div className="w-px h-12 bg-on-inverse-surface/20" />
      <button className="text-on-inverse-surface/60 hover:text-white transition-colors">
        <Search size={20} />
      </button>
      <button className="text-on-inverse-surface/60 hover:text-white transition-colors">
        <AlertCircle size={20} />
      </button>
    </div>
  );
};

const StatusBadge = ({ status }: { status: InventoryItem['status'] }) => {
  const styles = {
    healthy: 'status-healthy',
    warning: 'status-warning',
    critical: 'status-critical',
  };
  
  return (
    <span className={`status-block ${styles[status]}`}>
      {status}
    </span>
  );
};

// --- Screens ---

const Dashboard = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      <header>
        <p className="text-on-surface-variant text-sm font-medium uppercase tracking-widest mb-2">Morning Shift • March 22</p>
        <h1 className="text-5xl font-bold">Kitchen Pulse</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Active Orders', value: '14', sub: '+2 from last hour', icon: ClipboardList, color: 'text-primary' },
          { label: 'Stock Alerts', value: '03', sub: '2 critical items', icon: AlertCircle, color: 'text-error' },
          { label: 'Revenue Today', value: '$4.2k', sub: '12% above target', icon: TrendingUp, color: 'text-emerald-700' },
        ].map((stat, i) => (
          <div key={i} className="bg-surface-container-lowest p-8 rounded-md shadow-ambient border-l-4 border-primary">
            <div className="flex justify-between items-start mb-4">
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-tighter">{stat.label}</span>
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
            <button className="btn-tertiary text-sm">View All</button>
          </div>
          <div className="space-y-4">
            {MOCK_ORDERS.map((order) => (
              <div key={order.id} className="bg-surface-container-lowest p-6 rounded-md flex justify-between items-center group cursor-pointer hover:bg-surface-bright transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-display font-bold text-lg">{order.table}</span>
                    <span className="text-xs text-on-surface-variant font-mono">{order.id}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant">{order.items.join(', ')}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold mb-1">{order.time}</div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm ${
                    order.status === 'ready' ? 'bg-emerald-100 text-emerald-800' : 'bg-secondary-container text-on-secondary-container'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-surface-container-low p-8 rounded-md">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Inventory Watch</h2>
            <button className="btn-tertiary text-sm">Manage</button>
          </div>
          <div className="space-y-4">
            {MOCK_INVENTORY.slice(0, 4).map((item) => (
              <div key={item.id} className="bg-surface-container-lowest p-6 rounded-md flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-12 rounded-full ${
                    item.status === 'healthy' ? 'bg-emerald-500' : item.status === 'warning' ? 'bg-primary-container' : 'bg-error'
                  }`} />
                  <div>
                    <h3 className="font-bold">{item.name}</h3>
                    <p className="text-xs text-on-surface-variant">{item.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-bold text-xl">{item.quantity} <span className="text-sm text-on-surface-variant font-normal">{item.unit}</span></div>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
};

const Inventory = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-bold mb-2">Inventory</h1>
          <p className="text-on-surface-variant">Manage your stock levels and supply chain.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          New Entry
        </button>
      </header>

      <div className="bg-surface-container-lowest rounded-md shadow-ambient overflow-hidden">
        <div className="p-6 bg-surface-container-low flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            <input 
              type="text" 
              placeholder="Search items, categories..." 
              className="w-full bg-surface-container-lowest pl-10 pr-4 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            />
          </div>
          <select className="bg-surface-container-lowest px-4 py-2 rounded-md text-sm focus:outline-none">
            <option>All Categories</option>
            <option>Proteins</option>
            <option>Produce</option>
            <option>Dairy</option>
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
            {MOCK_INVENTORY.map((item) => (
              <tr key={item.id} className="hover:bg-surface transition-colors group">
                <td className="px-6 py-5">
                  <div className="font-bold text-on-surface">{item.name}</div>
                  <div className="text-xs text-on-surface-variant font-mono">SKU-{item.id}000</div>
                </td>
                <td className="px-6 py-5 text-sm text-on-surface-variant">{item.category}</td>
                <td className="px-6 py-5">
                  <div className="font-display font-bold text-lg">{item.quantity} {item.unit}</div>
                </td>
                <td className="px-6 py-5">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-6 py-5 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    {item.lastUpdated}
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <button className="p-2 hover:bg-surface-container-highest rounded-md transition-colors text-on-surface-variant">
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

const Orders = () => {
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
          <button className="btn-secondary">History</button>
          <button className="btn-primary">New Order</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_ORDERS.map((order) => (
          <div key={order.id} className="bg-surface-container-lowest rounded-md shadow-ambient flex flex-col">
            <div className={`h-1.5 w-full rounded-t-md ${
              order.status === 'pending' ? 'bg-primary-container' : order.status === 'preparing' ? 'bg-primary' : 'bg-emerald-500'
            }`} />
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-3xl font-display font-bold">{order.table}</h3>
                  <span className="text-xs text-on-surface-variant font-mono">{order.id}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{order.time}</div>
                  <div className="text-[10px] text-on-surface-variant uppercase font-bold">Received</div>
                </div>
              </div>
              
              <div className="space-y-3 mb-8">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/30" />
                    <span className="text-on-surface font-medium">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-surface-container-high flex gap-3">
                <button className="flex-1 btn-secondary text-xs py-2">Void</button>
                <button className="flex-[2] btn-primary text-xs py-2">
                  {order.status === 'pending' ? 'Start Prep' : order.status === 'preparing' ? 'Mark Ready' : 'Serve'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [screen, setScreen] = React.useState<Screen>('dashboard');

  return (
    <div className="flex h-screen bg-surface overflow-hidden text-on-surface selection:bg-primary/20">
      <Sidebar activeScreen={screen} setScreen={setScreen} />
      
      <main className="flex-1 overflow-y-auto relative pr-16">
        <div className="max-w-7xl mx-auto px-8 md:px-20 py-16">
          <AnimatePresence mode="wait">
            {screen === 'dashboard' && <Dashboard key="dashboard" />}
            {screen === 'inventory' && <Inventory key="inventory" />}
            {screen === 'orders' && <Orders key="orders" />}
          </AnimatePresence>
        </div>
      </main>

      <QuickActionRail />

      {/* Ambient Background Element */}
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-primary/5 blur-[120px] pointer-events-none rounded-full" />
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-secondary-container/10 blur-[120px] pointer-events-none rounded-full" />
    </div>
  );
}
