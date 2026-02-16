/**
 * API functions for product CRUD operations.
 * Maps to Spring Boot endpoints at `/api/products`.
 */
import client from './client';
import type { Product } from '../types';

/** GET /api/products - Fetch all products. */
export async function getProducts(): Promise<Product[]> {
  const { data } = await client.get<Product[]>('/products');
  return data;
}

export async function getProduct(id: number): Promise<Product> {
  const { data } = await client.get<Product>(`/products/${id}`);
  return data;
}

export async function createProduct(product: Omit<Product, 'productId'>): Promise<Product> {
  const { data } = await client.post<Product>('/products', product);
  return data;
}

export async function updateProduct(id: number, product: Omit<Product, 'productId'>): Promise<Product> {
  const { data } = await client.put<Product>(`/products/${id}`, product);
  return data;
}

export async function deleteProduct(id: number): Promise<void> {
  await client.delete(`/products/${id}`);
}
