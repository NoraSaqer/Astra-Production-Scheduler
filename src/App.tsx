import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Settings, 
  Trash2, 
  Play,
  Zap,
  Package,
  Cpu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import {
  Order,
  Machine,
  Product,
  PRODUCTS,
  MACHINES,
  getMachineRowIdsFromScheduledTasks,
  totalMachineInstanceCount,
} from './types';
import { initialOrders } from './logic/mockData';
import { generateSchedule } from './logic/schedulerEngine';
import { cn } from './lib/utils';

// Components
import { KPICards } from './components/KPICards';
import { GanttChart } from './components/GanttChart';
import { ScheduleTable } from './components/ScheduleTable';
import { OrderForm } from './components/OrderForm';

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [machines, setMachines] = useState<Record<string, Machine>>(MACHINES);
  const [products, setProducts] = useState<Record<string, Product>>(PRODUCTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'machines' | 'products'>('machines');

  const schedule = useMemo(() => generateSchedule(orders, machines, products), [orders, machines, products]);

  const machineRowIds = useMemo(
    () => getMachineRowIdsFromScheduledTasks(schedule, machines),
    [schedule, machines]
  );

  const kpis = useMemo(() => {
    if (schedule.length === 0) return { makespan: 0, orderCount: 0, utilization: 0 };
    
    const minTime = Math.min(...schedule.map(t => t.startTime.getTime()));
    const maxTime = Math.max(...schedule.map(t => t.endTime.getTime()));
    const makespan = Math.ceil((maxTime - minTime) / (1000 * 60 * 60));
    
    const totalWorkingTime = schedule.reduce((acc, task) => {
      return acc + (task.endTime.getTime() - task.startTime.getTime());
    }, 0);
    
    const instanceCount = totalMachineInstanceCount(machines);
    const totalAvailableTime = makespan * instanceCount * 1000 * 60 * 60;
    const utilization = totalAvailableTime > 0 ? Math.round((totalWorkingTime / totalAvailableTime) * 100) : 0;

    return {
      makespan,
      orderCount: new Set(schedule.map(t => t.orderId)).size,
      utilization
    };
  }, [schedule, machines]);

  const handleRunSchedule = () => {
    setOrders(initialOrders);
  };

  const handleAddUrgentOrder = () => {
    const newOrder: Order = {
      id: `ORD-URGENT-${Date.now()}`,
      productName: "Urgent Paracetamol",
      type: "Tablet",
      quantityBoxes: 5000,
      priority: "Urgent"
    };
    setOrders(prev => [newOrder, ...prev]);
  };

  const deleteOrder = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const clearAll = () => {
    if (confirm("Are you sure you want to clear all orders?")) {
      setOrders([]);
    }
  };

  const updateMachine = (id: string, field: keyof Machine, value: number) => {
    setMachines((prev) => {
      const cur = prev[id];
      let next = value;
      if (field === 'count') {
        next = Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
      } else if (field === 'speedPerHour') {
        const prevSpeed = typeof cur.speedPerHour === 'number' && cur.speedPerHour > 0 ? cur.speedPerHour : 1;
        next = Number.isFinite(value) && value > 0 ? value : prevSpeed;
      } else if (field === 'efficiency') {
        const prevEff =
          typeof cur.efficiency === 'number' && cur.efficiency > 0 && cur.efficiency <= 1
            ? cur.efficiency
            : 1;
        next =
          Number.isFinite(value) && value > 0 && value <= 1 ? value : prevEff;
      } else if (field === 'setupTimeHours' || field === 'changeoverTimeHours') {
        const prevH = cur[field] as number;
        const fallback =
          typeof prevH === 'number' && Number.isFinite(prevH) && prevH >= 0 ? prevH : 0;
        next = Number.isFinite(value) && value >= 0 ? value : fallback;
      }
      return {
        ...prev,
        [id]: { ...cur, [field]: next },
      };
    });
  };

  const updateProduct = (name: string, field: keyof Product, value: any) => {
    setProducts(prev => ({
      ...prev,
      [name]: { ...prev[name], [field]: value }
    }));
  };

  const addProduct = () => {
    const name = prompt("Enter new product name:");
    if (name && !products[name]) {
      setProducts(prev => ({
        ...prev,
        [name]: { name, type: 'Tablet', unitsPerBox: 1000 }
      }));
    }
  };

  const deleteProduct = (name: string) => {
    if (Object.keys(products).length <= 1) {
      alert("You must have at least one product.");
      return;
    }
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      const newProducts = { ...products };
      delete newProducts[name];
      setProducts(newProducts);
      // Also delete orders with this product
      setOrders(prev => prev.filter(o => o.productName !== name));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-200">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Astra Production Scheduler</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pharmaceutical PoC v2.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
              title="Configuration"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={clearAll}
              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title="Clear All"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-slate-200 mx-1" />
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-100"
            >
              <PlusCircle className="w-4 h-4" />
              Manual Order
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-8">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={handleRunSchedule}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-100 group"
          >
            <Play className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            Load 2025 Orders & Generate Schedule
          </button>
          
          <button 
            onClick={handleAddUrgentOrder}
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-rose-100 group"
          >
            <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
            + Inject Urgent Order (Simulation)
          </button>
        </div>

        {/* Dashboard KPIs */}
        <KPICards {...kpis} />

        {/* Gantt Chart Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Production Timeline
              <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Real-time</span>
            </h2>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            {schedule.length > 0 ? (
              <GanttChart tasks={schedule} machineRowIds={machineRowIds} />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                <LayoutDashboard className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium">No orders scheduled yet</p>
                <p className="text-xs">Load 2025 orders or add a manual order to begin</p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Schedule Table */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Detailed Production Plan</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {schedule.length > 0 ? (
              <ScheduleTable 
                schedule={schedule} 
                orders={orders} 
                onDeleteOrder={deleteOrder} 
              />
            ) : (
              <div className="p-12 text-center text-slate-400">
                <p>Add orders to view the detailed stage-by-stage plan</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Manual Order Modal */}
      <OrderForm 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAddOrder={(order) => setOrders(prev => [...prev, order])}
        products={products}
      />

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, x: 20 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0.95, opacity: 0, x: 20 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Settings className="text-slate-600 w-5 h-5" />
                  System Configuration
                </h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex border-b border-slate-100">
                <button 
                  onClick={() => setSettingsTab('machines')}
                  className={cn(
                    "flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2",
                    settingsTab === 'machines' ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/30" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Cpu className="w-4 h-4" />
                  Machines
                </button>
                <button 
                  onClick={() => setSettingsTab('products')}
                  className={cn(
                    "flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2",
                    settingsTab === 'products' ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/30" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Package className="w-4 h-4" />
                  Products
                </button>
              </div>

              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {settingsTab === 'machines' ? (
                  <div className="space-y-6">
                    <p className="text-xs text-slate-400 font-medium italic">
                      Note: Durations use units ÷ (speed × efficiency) plus setup or changeover. Manual stages use an editable manual throughput (units/hour), not automatic line speed.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(Object.values(machines) as Machine[]).map((machine) => (
                        <div key={machine.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/30 space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-slate-800">{machine.name}</h4>
                            <span
                              className={
                                machine.operationType === 'manual'
                                  ? 'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200'
                              }
                            >
                              {machine.operationType === 'manual' ? 'Manual Operation' : 'Machine'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1 col-span-2">
                              <label className="text-[10px] font-bold uppercase text-slate-400">
                                {machine.operationType === 'manual' ? 'Number of operator / line' : 'Number of Machines'}
                              </label>
                              <input
                                type="number"
                                min={1}
                                step={1}
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                value={machine.count}
                                onChange={(e) =>
                                  updateMachine(machine.id, 'count', parseInt(e.target.value, 10))
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-400">
                                {machine.operationType === 'manual' ? 'Manual capacity (units/hr)' : 'Speed/Hr'}
                              </label>
                              <input 
                                type="number" 
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                value={machine.speedPerHour}
                                onChange={(e) => updateMachine(machine.id, 'speedPerHour', parseFloat(e.target.value))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-400">Efficiency (0-1)</label>
                              <input 
                                type="number" 
                                step="0.1"
                                min="0"
                                max="1"
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                value={machine.efficiency}
                                onChange={(e) => updateMachine(machine.id, 'efficiency', parseFloat(e.target.value))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-400">Setup (h)</label>
                              <input 
                                type="number" 
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                value={machine.setupTimeHours}
                                onChange={(e) => updateMachine(machine.id, 'setupTimeHours', parseFloat(e.target.value))}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-400">Changeover (h)</label>
                              <input 
                                type="number" 
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                value={machine.changeoverTimeHours}
                                onChange={(e) => updateMachine(machine.id, 'changeoverTimeHours', parseFloat(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400 font-medium italic">Define product types and packaging units.</p>
                      <button 
                        onClick={addProduct}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        + Add Product
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(Object.values(products) as Product[]).map((product) => (
                        <div key={product.name} className="p-4 border border-slate-100 rounded-xl bg-slate-50/30 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-800">{product.name}</h4>
                            <button 
                              onClick={() => deleteProduct(product.name)}
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-400">Type</label>
                              <select 
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                value={product.type}
                                onChange={(e) => updateProduct(product.name, 'type', e.target.value as any)}
                              >
                                <option value="Tablet">Tablet</option>
                                <option value="Capsule">Capsule</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-slate-400">Units/Box</label>
                              <input 
                                type="number" 
                                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm"
                                value={product.unitsPerBox}
                                onChange={(e) => updateProduct(product.name, 'unitsPerBox', parseInt(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                >
                  Save & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
