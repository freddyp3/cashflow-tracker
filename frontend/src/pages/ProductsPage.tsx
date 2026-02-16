/**
 * Product management page with full CRUD.
 * Lists all products in a table with Edit/Delete actions.
 * Toggle-able inline form for creating or editing products.
 * Uses React Query for data fetching and cache invalidation on mutations.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/products';
import type { Product } from '../types';
import ProductList from '../components/products/ProductList';
import ProductForm from '../components/products/ProductForm';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Omit<Product, 'productId'> }) =>
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditing(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  function handleSubmit(data: Omit<Product, 'productId'>) {
    if (editing) {
      updateMutation.mutate({ id: editing.productId, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function handleEdit(product: Product) {
    setEditing(product);
    setShowForm(true);
  }

  function handleDelete(id: number) {
    if (confirm('Delete this product?')) {
      deleteMutation.mutate(id);
    }
  }

  if (isLoading) {
    return <p className="text-gray-400">Loading products...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        {!showForm && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-600 transition-colors"
          >
            + New Product
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <ProductForm
            product={editing}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      )}

      <ProductList products={products} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
