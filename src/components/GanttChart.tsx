import React from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ScheduledTask } from '../types';

interface GanttChartProps {
  tasks: ScheduledTask[];
  /** One entry per physical machine row (e.g. Mixing-1, Mixing-2), in display order. */
  machineRowIds: string[];
}

export const GanttChart: React.FC<GanttChartProps> = ({ tasks, machineRowIds }) => {
  if (tasks.length === 0) return null;

  const minTime = Math.min(...tasks.map(t => t.startTime.getTime()));
  const maxTime = Math.max(...tasks.map(t => t.endTime.getTime()));
  const totalDuration = maxTime - minTime;

  // Calculate grid lines (every 12 hours)
  const hours = Math.ceil(totalDuration / (1000 * 60 * 60));
  const gridLines = Array.from({ length: Math.ceil(hours / 12) + 1 }, (_, i) => i * 12);

  return (
    <div className="relative border border-slate-100 rounded-lg overflow-hidden bg-slate-50/30">
      {/* Time Header */}
      <div className="flex border-b border-slate-100 bg-white">
        <div className="w-40 flex-shrink-0 border-r border-slate-100 p-3 text-[10px] font-bold uppercase text-slate-400 tracking-widest">
          Stage
        </div>
        <div className="flex-1 relative h-10">
          {gridLines.map(h => (
            <div 
              key={h}
              className="absolute top-0 bottom-0 border-l border-slate-100 text-[9px] font-medium text-slate-400 pl-1 pt-3"
              style={{ left: `${(h / hours) * 100}%` }}
            >
              +{h}h
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100">
        {machineRowIds.map((rowId) => {
          const machineTasks = tasks.filter((t) => t.machineId === rowId);
          const rowManual = machineTasks.some((t) => t.operationType === 'manual');
          return (
            <div key={rowId} className="flex group">
              <div
                className={`w-40 flex-shrink-0 border-r border-slate-100 p-3 bg-white group-hover:bg-slate-50 transition-colors ${
                  rowManual ? 'border-l-2 border-l-amber-400' : ''
                }`}
              >
                <p className="text-xs font-bold text-slate-700">{rowId}</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {rowManual ? 'Manual stage' : 'Machine line'} · {machineTasks.length} tasks
                </p>
              </div>
              <div className="flex-1 relative h-16 overflow-hidden">
                {/* Grid vertical lines background */}
                {gridLines.map(h => (
                  <div 
                    key={h}
                    className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                    style={{ left: `${(h / hours) * 100}%` }}
                  />
                ))}
                
                {/* Task Bars */}
                {machineTasks.map((task) => {
                  const left = ((task.startTime.getTime() - minTime) / totalDuration) * 100;
                  const width = ((task.endTime.getTime() - task.startTime.getTime()) / totalDuration) * 100;
                  
                  return (
                    <motion.div
                      key={`${task.orderId}-${task.machineId}-${task.startTime.getTime()}`}
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      className="absolute top-3 bottom-3 rounded-md shadow-sm flex items-center px-2 overflow-hidden cursor-pointer group/task"
                      style={{ 
                        left: `${left}%`, 
                        width: `${width}%`, 
                        backgroundColor: task.color,
                        transformOrigin: 'left'
                      }}
                    >
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/task:opacity-100 transition-opacity" />
                      <p className="text-[9px] font-bold text-white truncate drop-shadow-sm">
                        {task.productName}
                      </p>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/task:block z-50">
                        <div className="bg-slate-900 text-white text-[10px] p-2 rounded shadow-xl whitespace-nowrap">
                          <p className="font-bold">{task.productName}</p>
                          <p className="opacity-70">{format(task.startTime, 'HH:mm')} - {format(task.endTime, 'HH:mm')}</p>
                        </div>
                        <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1"></div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
