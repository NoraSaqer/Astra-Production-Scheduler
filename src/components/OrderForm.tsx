import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PlusCircle } from 'lucide-react';
import { Order, PRODUCTS, ProductType } from '../types';

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOrder: (order: Order) => void;
  products: Record<string, any>;
}

export const OrderForm: React.FC<OrderFormProps> = ({ isOpen, onClose, onAddOrder, products }) => {
  const [newOrder, setNewOrder] = React.useState<Partial<Order>>({ 
    priority: 'Normal', 
    productName: Object.keys(products)[0] || 'Astra Ferrous',
    type: 'Tablet'
  });

  React.useEffect(() => {
    if (isOpen) {
      setNewOrder({ 
        priority: 'Normal', 
        productName: Object.keys(products)[0] || '',
        type: products[Object.keys(products)[0]]?.type || 'Tablet'
      });
    }
  }, [isOpen, products]);

  const handleSubmit = () => {
    if (!newOrder.productName || !newOrder.quantityBoxes) return;
    
    const order: Order = {
      id: `manual-${Date.now()}`,
      productName: newOrder.productName as string,
      type: products[newOrder.productName]?.type || 'Tablet',
      quantityBoxes: Number(newOrder.quantityBoxes),
      priority: newOrder.priority || 'Normal',
    };
    
    onAddOrder(order);
    onClose();
    setNewOrder({ priority: 'Normal', productName: Object.keys(products)[0], type: 'Tablet' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <PlusCircle className="text-blue-600 w-5 h-5" />
                Create New Order
              </h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Product Name</label>
                  <select 
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={newOrder.productName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setNewOrder(prev => ({ 
                        ...prev, 
                        productName: name,
                        type: products[name]?.type || 'Tablet'
                      }));
                    }}
                  >
                    {Object.keys(products).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Priority</label>
                  <select 
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={newOrder.priority}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, priority: e.target.value as any }))}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Quantity (Boxes)</label>
                <input 
                  type="number" 
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="e.g. 5000"
                  value={newOrder.quantityBoxes || ''}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, quantityBoxes: parseInt(e.target.value, 10) }))}
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                Add to Schedule
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
