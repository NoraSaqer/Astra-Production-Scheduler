import React from 'react';
import { Clock, CheckCircle2, BarChart3 } from 'lucide-react';
import { cn } from '../lib/utils';

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const KPI = ({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) => (
  <Card className="p-4 flex items-center gap-4">
    <div className={cn("p-3 rounded-lg", color)}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  </Card>
);

interface KPICardsProps {
  makespan: number;
  orderCount: number;
  utilization: number;
}

export const KPICards: React.FC<KPICardsProps> = ({ makespan, orderCount, utilization }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <KPI title="Total Makespan" value={`${makespan} Hours`} icon={Clock} color="bg-indigo-500" />
      <KPI title="Orders Scheduled" value={orderCount} icon={CheckCircle2} color="bg-emerald-500" />
      <KPI title="Machine Utilization" value={`${utilization}%`} icon={BarChart3} color="bg-amber-500" />
    </div>
  );
};
