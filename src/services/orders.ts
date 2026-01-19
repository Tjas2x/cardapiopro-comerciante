import { api } from "./api";

export type OrderStatus =
  | "NEW"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELED";

export type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
  nameSnapshot: string;
};

export type Order = {
  id: string;
  status: OrderStatus;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  totalCents: number;
  createdAt: string;
  items: OrderItem[];
};

export async function listOrders(): Promise<Order[]> {
  const res = await api.get("/orders");
  return Array.isArray(res.data) ? res.data : [res.data];
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const res = await api.patch(`/orders/${orderId}/status`, { status });
  return res.data;
}
