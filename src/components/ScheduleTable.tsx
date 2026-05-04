import React from 'react';
import { format, differenceInHours } from 'date-fns';
import { ScheduledTask, Order } from '../types';
import { Trash2 } from 'lucide-react';

interface ScheduleTableProps {
  schedule: ScheduledTask[];
  orders: Order[];
  onDeleteOrder: (id: string) => void;
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({ schedule, orders, onDeleteOrder }) => {
  const rows = [...schedule].sort((a, b) => {
    const t = a.startTime.getTime() - b.startTime.getTime();
    if (t !== 0) return t;
    return a.orderId.localeCompare(b.orderId);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase text-slate-500 bg-slate-50 border-y border-slate-100">
          <tr>
            <th className="px-4 py-3 font-semibold">Order ID</th>
            <th className="px-4 py-3 font-semibold">Product</th>
            <th className="px-4 py-3 font-semibold">Stage</th>
            <th className="px-4 py-3 font-semibold">Start Time</th>
            <th className="px-4 py-3 font-semibold">End Time</th>
            <th className="px-4 py-3 font-semibold">Duration</th>
            <th className="px-4 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((task, i) => (
            <tr key={`${task.orderId}-${task.machineId}-${task.startTime.getTime()}-${i}`} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-slate-500">{task.orderId}</td>
              <td className="px-4 py-3 font-medium">
                <div className="flex items-center gap-2">
                  {task.productName}
                  {orders.find(o => o.id === task.orderId)?.priority === 'Urgent' && (
                    <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-bold rounded uppercase">Urgent</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    {task.machineName}
                  </span>
                  {task.operationType === 'manual' ? (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-800 border border-amber-200">
                      Manual
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-slate-50 text-slate-500 border border-slate-200">
                      Machine
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">{format(task.startTime, 'MMM d, HH:mm')}</td>
              <td className="px-4 py-3 text-slate-600">{format(task.endTime, 'MMM d, HH:mm')}</td>
              <td className="px-4 py-3 text-slate-600 font-medium">{differenceInHours(task.endTime, task.startTime)}h</td>
              <td className="px-4 py-3 text-right">
                <button 
                  onClick={() => onDeleteOrder(task.orderId)}
                  className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                  title="Delete Order"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
