import { Order } from '../types';

export const initialOrders: Order[] = [
  {
    id: "ORD-001",
    productName: "Astra Ferrous Gluconate",
    type: "Tablet",
    quantityBoxes: 4800,
    priority: "Normal"
  },
  {
    id: "ORD-002",
    productName: "Astra Vit Plus",
    type: "Capsule",
    quantityBoxes: 17467,
    priority: "Normal"
  },
  {
    id: "ORD-003",
    productName: "Astra Cal Plus D3",
    type: "Tablet",
    quantityBoxes: 1125,
    priority: "Normal"
  }
];
