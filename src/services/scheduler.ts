import { addHours, max } from 'date-fns';
import {
  Order,
  Machine,
  ROUTES,
  ScheduledTask,
  COLORS,
  Product,
  normalizedMachineCount,
  effectiveOperationType,
  computeStageDurationHours,
  machineInstanceResourceKey,
} from '../types';

function instanceTaskIds(
  typeId: string,
  slotIndex0: number,
  instanceCount: number,
  machine: Machine
): { machineId: string; machineName: string } {
  if (instanceCount <= 1) {
    return { machineId: typeId, machineName: machine.name };
  }
  const label = `${typeId}-${slotIndex0 + 1}`;
  return { machineId: label, machineName: label };
}

export function calculateSchedule(
  orders: Order[],
  machines: Record<string, Machine>,
  products: Record<string, Product>,
  startDate: Date = new Date()
): ScheduledTask[] {
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
    if (a.priority !== 'Urgent' && b.priority === 'Urgent') return 1;
    return 0;
  });

  const schedule: ScheduledTask[] = [];
  const machineAvailability: Record<string, Date[]> = {};
  const lastProductOnInstance: Record<string, string> = {};

  Object.keys(machines).forEach((id) => {
    const n = normalizedMachineCount(machines[id]);
    machineAvailability[id] = Array.from({ length: n }, () => new Date(startDate));
  });

  sortedOrders.forEach((order, index) => {
    const product = products[order.productName] || products[Object.keys(products)[0]];
    if (!product) return;

    const route = ROUTES[product.type] ?? ROUTES.Tablet;
    const totalUnits = order.quantityBoxes * product.unitsPerBox;
    const orderColor = COLORS[index % COLORS.length];

    let lastStageEndTime = startDate;

    route.forEach((machineTypeId) => {
      const machine = machines[machineTypeId];
      if (!machine) return;

      const slots = machineAvailability[machineTypeId];
      if (!slots?.length) return;

      const n = slots.length;
      const snapshot = { ...lastProductOnInstance };

      let bestIdx = 0;
      let bestEndMs = Infinity;
      for (let i = 0; i < n; i++) {
        const durationHours = computeStageDurationHours(
          machine,
          machineTypeId,
          i,
          n,
          order.productName,
          totalUnits,
          snapshot
        );
        const startTime = max([slots[i], lastStageEndTime]);
        const endTime = addHours(startTime, durationHours);
        const endMs = endTime.getTime();
        if (Number.isFinite(endMs) && endMs < bestEndMs) {
          bestEndMs = endMs;
          bestIdx = i;
        }
      }

      const durationHours = computeStageDurationHours(
        machine,
        machineTypeId,
        bestIdx,
        n,
        order.productName,
        totalUnits,
        snapshot
      );
      const startTime = max([slots[bestIdx], lastStageEndTime]);
      const endTime = addHours(startTime, durationHours);

      const trackKey = machineInstanceResourceKey(machineTypeId, bestIdx, n);
      lastProductOnInstance[trackKey] = order.productName;

      const { machineId, machineName } = instanceTaskIds(machineTypeId, bestIdx, n, machine);

      schedule.push({
        orderId: order.id,
        productName: order.productName,
        machineId,
        machineName,
        startTime,
        endTime,
        stage: machineTypeId,
        color: orderColor,
        operationType: effectiveOperationType(machine),
      });

      slots[bestIdx] = endTime;
      lastStageEndTime = endTime;
    });
  });

  return schedule;
}
