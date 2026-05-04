import {
  Order,
  ScheduledTask,
  COLORS,
  Machine,
  Product,
  MACHINES,
  PRODUCTS,
  MACHINE_TYPE_ORDER,
  ROUTES,
  normalizedMachineCount,
  effectiveOperationType,
  computeStageDurationHours,
  machineInstanceResourceKey,
} from '../types';
import { addHours } from 'date-fns';

function initMachineAvailabilityHours(
  machines: Record<string, Machine>
): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const id of MACHINE_TYPE_ORDER) {
    const n = normalizedMachineCount(machines[id]);
    out[id] = Array(n).fill(0);
  }
  return out;
}

/** Display / task ids: backward-compatible single machine uses plain type id. */
function instanceTaskIds(
  typeId: string,
  slotIndex0: number,
  instanceCount: number,
  machine: Machine
): { machineId: string; machineName: string } {
  if (instanceCount <= 1) {
    return { machineId: typeId, machineName: machine.name };
  }
  const suffix = slotIndex0 + 1;
  const label = `${typeId}-${suffix}`;
  return { machineId: label, machineName: label };
}

export function generateSchedule(
  orders: Order[],
  machines: Record<string, Machine> = MACHINES,
  products: Record<string, Product> = PRODUCTS,
  startDate: Date = new Date()
): ScheduledTask[] {
  const machineAvailableTime = initMachineAvailabilityHours(machines);
  const scheduleTasks: ScheduledTask[] = [];
  const lastProductOnInstance: Record<string, string> = {};

  const sortedOrders = [...orders].sort((a, b) => {
    if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
    if (a.priority !== 'Urgent' && b.priority === 'Urgent') return 1;
    return 0;
  });

  const assignStage = (
    typeId: string,
    minStartHours: number,
    productName: string,
    totalUnits: number,
    orderColor: string,
    orderId: string
  ): number => {
    const machine = machines[typeId];
    if (!machine) return minStartHours;

    const slots = machineAvailableTime[typeId];
    if (!slots?.length) return minStartHours;

    const n = slots.length;
    const snapshot = { ...lastProductOnInstance };

    let bestIdx = 0;
    let bestEnd = Infinity;
    for (let i = 0; i < n; i++) {
      const duration = computeStageDurationHours(
        machine,
        typeId,
        i,
        n,
        productName,
        totalUnits,
        snapshot
      );
      const slotAvail = Number.isFinite(slots[i]) ? slots[i] : 0;
      const start = Math.max(minStartHours, slotAvail);
      const end = start + duration;
      if (Number.isFinite(end) && end < bestEnd) {
        bestEnd = end;
        bestIdx = i;
      }
    }

    const duration = computeStageDurationHours(
      machine,
      typeId,
      bestIdx,
      n,
      productName,
      totalUnits,
      snapshot
    );
    const slotAvail = Number.isFinite(slots[bestIdx]) ? slots[bestIdx] : 0;
    const start = Math.max(minStartHours, slotAvail);
    const end = start + duration;

    const key = machineInstanceResourceKey(typeId, bestIdx, n);
    lastProductOnInstance[key] = productName;
    slots[bestIdx] = end;

    const { machineId, machineName } = instanceTaskIds(typeId, bestIdx, n, machine);

    scheduleTasks.push({
      orderId,
      productName,
      machineId,
      machineName,
      startTime: addHours(startDate, start),
      endTime: addHours(startDate, end),
      stage: typeId,
      color: orderColor,
      operationType: effectiveOperationType(machine),
    });

    return end;
  };

  sortedOrders.forEach((order, index) => {
    const orderColor = COLORS[index % COLORS.length];
    const product = products[order.productName] || { type: 'Tablet' as const, unitsPerBox: 1000 };
    const totalUnits = order.quantityBoxes * product.unitsPerBox;

    const route = ROUTES[product.type] ?? ROUTES.Tablet;
    let stageEnd = 0;

    route.forEach((typeId, stepIndex) => {
      const minStart = stepIndex === 0 ? 0 : stageEnd;
      stageEnd = assignStage(typeId, minStart, order.productName, totalUnits, orderColor, order.id);
    });
  });

  return scheduleTasks;
}
