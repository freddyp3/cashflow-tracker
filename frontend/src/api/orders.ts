/**
 * API functions for order CRUD operations.
 * Maps to Spring Boot endpoints at `/api/orders`.
 * Returns OrderResponse DTOs with denormalized product names.
 */
import client from './client';
import type { Order, OrderRequest } from '../types';

/** GET /api/orders - Fetch all orders with nested items. */
export async function getOrders(): Promise<Order[]> {
  const { data } = await client.get<Order[]>('/orders');
  return data;
}

export async function getOrder(id: number): Promise<Order> {
  const { data } = await client.get<Order>(`/orders/${id}`);
  return data;
}

export async function createOrder(order: OrderRequest): Promise<Order> {
  const { data } = await client.post<Order>('/orders', order);
  return data;
}

export async function updateOrder(id: number, order: OrderRequest): Promise<Order> {
  const { data } = await client.put<Order>(`/orders/${id}`, order);
  return data;
}

export async function deleteOrder(id: number): Promise<void> {
  await client.delete(`/orders/${id}`);
}
