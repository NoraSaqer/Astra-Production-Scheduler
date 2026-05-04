export type ProductType = 'Tablet' | 'Capsule';

export type OperationType = 'machine' | 'manual';

export interface Product {
  name: string;
  type: ProductType;
  unitsPerBox: number;
}

export interface Machine {
  id: string;
  name: string;
  /** Automated line vs manual production stage (affects UI labels; duration still uses speedPerHour). */
  operationType: OperationType;
  /** Number of identical machines of this type (parallel capacity). Defaults to 1. */
  count: number;
  speedPerHour: number; // units per hour (for manual stages: editable manual throughput)
  setupTimeHours: number;
  changeoverTimeHours: number;
  efficiency: number; // 0 to 1
}

export interface Order {
  id: string;
  productName: string;
  type?: ProductType; // Added to match user's mock data
  quantityBoxes: number;
  priority: 'Normal' | 'Urgent';
  targetDelivery?: string;
}

export interface ScheduledTask {
  orderId: string;
  productName: string;
  machineId: string;
  machineName: string;
  startTime: Date;
  endTime: Date;
  stage: string;
  color: string;
  operationType: OperationType;
}

export const PRODUCTS: Record<string, Product> = {
  'Astra Ferrous': { name: 'Astra Ferrous', type: 'Tablet', unitsPerBox: 1000 },
  'Astra Vit Plus': { name: 'Astra Vit Plus', type: 'Capsule', unitsPerBox: 600 },
  'Astra Panadol': { name: 'Astra Panadol', type: 'Tablet', unitsPerBox: 1200 },
  'Astra Omega': { name: 'Astra Omega', type: 'Capsule', unitsPerBox: 500 },
};

export const MACHINES: Record<string, Machine> = {
  'Mixing': {
    id: 'Mixing',
    name: 'Mixing',
    operationType: 'machine',
    count: 1,
    speedPerHour: 50000,
    setupTimeHours: 1,
    changeoverTimeHours: 0.5,
    efficiency: 1,
  },
  'Compression': {
    id: 'Compression',
    name: 'Compression',
    operationType: 'machine',
    count: 1,
    speedPerHour: 20000,
    setupTimeHours: 2,
    changeoverTimeHours: 1,
    efficiency: 1,
  },
  'Capsulation': {
    id: 'Capsulation',
    name: 'Capsulation',
    operationType: 'machine',
    count: 1,
    speedPerHour: 15000,
    setupTimeHours: 2,
    changeoverTimeHours: 1,
    efficiency: 1,
  },
  'Blistering': {
    id: 'Blistering',
    name: 'Blistering',
    operationType: 'machine',
    count: 1,
    speedPerHour: 10000,
    setupTimeHours: 1.5,
    changeoverTimeHours: 0.75,
    efficiency: 1,
  },
  'Counting': {
    id: 'Counting',
    name: 'Counting',
    operationType: 'machine',
    count: 1,
    speedPerHour: 12000,
    setupTimeHours: 1,
    changeoverTimeHours: 0.5,
    efficiency: 1,
  },
  'Labeling': {
    id: 'Labeling',
    name: 'Labeling',
    operationType: 'machine',
    count: 1,
    speedPerHour: 187.5, // 1500 bottles per 8 hours
    setupTimeHours: 2,
    changeoverTimeHours: 2.5,
    efficiency: 1,
  },
  'Printing': {
    id: 'Printing',
    name: 'Printing',
    operationType: 'machine',
    count: 1,
    speedPerHour: 150, // 1200 boxes per 8 hours
    setupTimeHours: 0.75,
    changeoverTimeHours: 1,
    efficiency: 1,
  },
  Packaging: {
    id: 'Packaging',
    name: 'Packaging',
    operationType: 'manual',
    count: 1,
    speedPerHour: 1200,
    setupTimeHours: 0.5,
    changeoverTimeHours: 0.25,
    efficiency: 1,
  },
  Packing: {
    id: 'Packing',
    name: 'Packing',
    operationType: 'manual',
    count: 1,
    speedPerHour: 1000,
    setupTimeHours: 0.5,
    changeoverTimeHours: 0.25,
    efficiency: 1,
  },
};

/**
 * Plant / flowchart order for Gantt row sorting, availability init, and KPI instance counts.
 * (Union of tablet and capsule paths in sequence.)
 */
export const MACHINE_TYPE_ORDER = [
  'Mixing',
  'Compression',
  'Capsulation',
  'Blistering',
  'Counting',
  'Labeling',
  'Printing',
  'Packaging',
  'Packing',
] as const;

export type MachineTypeId = (typeof MACHINE_TYPE_ORDER)[number];

export function normalizedMachineCount(machine: Machine | undefined): number {
  const raw = machine?.count;
  const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : 1;
  return Math.max(1, n);
}

export function effectiveOperationType(machine: Machine | undefined): OperationType {
  return machine?.operationType === 'manual' ? 'manual' : 'machine';
}

const MIN_EFFECTIVE_THROUGHPUT = 1e-9;

/**
 * Safe units/hour for duration math: `totalUnits / rate`.
 * Prevents Infinity/NaN when speed or efficiency are zero, negative, or non-finite.
 */
export function effectiveThroughputUnitsPerHour(machine: Machine): number {
  const s = machine.speedPerHour;
  const e = machine.efficiency;
  const speedOk = typeof s === 'number' && Number.isFinite(s) && s > 0;
  const effOk = typeof e === 'number' && Number.isFinite(e) && e > 0;
  const rate = (speedOk ? s : MIN_EFFECTIVE_THROUGHPUT) * (effOk ? e : 1);
  return Math.max(rate, MIN_EFFECTIVE_THROUGHPUT);
}

/** Setup/changeover hours must be finite and non-negative for schedule math. */
export function clampNonNegativeHours(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 0;
  return value;
}

/** One physical line / instance id (used for changeover state and task ids). */
export function machineInstanceResourceKey(
  typeId: string,
  slotIndex0: number,
  instanceCount: number
): string {
  if (instanceCount <= 1) return typeId;
  return `${typeId}-${slotIndex0 + 1}`;
}

/**
 * Stage duration in hours for a candidate slot, using a frozen snapshot of last
 * product per instance so we can compare slots without mutating scheduling state.
 */
export function computeStageDurationHours(
  machine: Machine,
  typeId: string,
  slotIndex0: number,
  instanceCount: number,
  productName: string,
  totalUnits: number,
  lastProducts: Record<string, string>
): number {
  const trackKey = machineInstanceResourceKey(typeId, slotIndex0, instanceCount);
  const prev = lastProducts[trackKey];
  const isProductChange = Boolean(prev && prev !== productName);
  const overheadRaw = isProductChange ? machine.changeoverTimeHours : machine.setupTimeHours;
  const overhead = clampNonNegativeHours(overheadRaw);
  const processingTime = totalUnits / effectiveThroughputUnitsPerHour(machine);
  return processingTime + overhead;
}

/** Row keys for Gantt: one row per physical instance (`Mixing` if count===1, else `Mixing-1`, `Mixing-2`, …). */
export function getMachineRowIds(machines: Record<string, Machine>): string[] {
  const rows: string[] = [];
  for (const typeId of MACHINE_TYPE_ORDER) {
    const m = machines[typeId];
    const n = normalizedMachineCount(m);
    if (n === 1) {
      rows.push(typeId);
    } else {
      for (let i = 1; i <= n; i++) {
        rows.push(`${typeId}-${i}`);
      }
    }
  }
  return rows;
}

export function totalMachineInstanceCount(machines: Record<string, Machine>): number {
  return MACHINE_TYPE_ORDER.reduce((sum, id) => sum + normalizedMachineCount(machines[id]), 0);
}

/** Gantt rows: only machine instances that appear in the schedule, in process order. */
export function getMachineRowIdsFromScheduledTasks(
  tasks: ScheduledTask[],
  machines: Record<string, Machine>
): string[] {
  if (tasks.length === 0) return [];
  const present = new Set(tasks.map((t) => t.machineId));
  const rows: string[] = [];
  for (const typeId of MACHINE_TYPE_ORDER) {
    const m = machines[typeId];
    if (!m) continue;
    const n = normalizedMachineCount(m);
    if (n === 1) {
      if (present.has(typeId)) rows.push(typeId);
    } else {
      for (let i = 1; i <= n; i++) {
        const id = `${typeId}-${i}`;
        if (present.has(id)) rows.push(id);
      }
    }
  }
  for (const id of present) {
    if (!rows.includes(id)) rows.push(id);
  }
  return rows;
}

export const ROUTES: Record<ProductType, string[]> = {
  Tablet: ['Mixing', 'Compression', 'Blistering', 'Packaging', 'Packing'],
  Capsule: ['Mixing', 'Capsulation', 'Counting', 'Labeling', 'Printing', 'Packaging', 'Packing'],
};

export const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
];
