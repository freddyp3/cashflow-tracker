/**
 * Product management page with full CRUD.
 * Lists all products with CN¥→CA$ cost equivalents and low-stock badges.
 * Create/edit happens in a Drawer; delete is confirmed via ConfirmDialog.
 * Uses React Query for data fetching and cache invalidation on mutations.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../api/products';
import { getRate } from '../api/currency';
import type { Product } from '../types';
import { Button, ConfirmDialog, Drawer, EmptyState, ErrorState, TableSkeleton } from '../components/ui';
import ProductList from '../components/products/ProductList';
import ProductForm from '../components/products/ProductForm';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const { data: cnyRate } = useQuery({
    queryKey: ['rate', 'CNY'],
    queryFn: () => getRate('CNY'),
    staleTime: 60 * 60 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['products'] });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      invalidate();
      closeDrawer();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Omit<Product, 'productId'> }) =>
      updateProduct(id, data),
    onSuccess: () => {
      invalidate();
      closeDrawer();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  function closeDrawer() {
    setDrawerOpen(false);
    setEditing(null);
  }

  function handleSubmit(data: Omit<Product, 'productId'>) {
    if (editing) {
      updateMutation.mutate({ id: editing.productId, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const products = productsQuery.data ?? [];
  const saveMutation = editing ? updateMutation : createMutation;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        <Button onClick={() => { setEditing(null); setDrawerOpen(true); }}>+ New Product</Button>
      </div>

      {productsQuery.isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : productsQuery.isError ? (
        <ErrorState onRetry={() => productsQuery.refetch()} />
      ) : products.length === 0 ? (
        <EmptyState
          title="No products yet"
          action={<Button onClick={() => { setEditing(null); setDrawerOpen(true); }}>+ New Product</Button>}
        />
      ) : (
        <ProductList
          products={products}
          cnyRate={cnyRate}
          onEdit={(p) => { setEditing(p); setDrawerOpen(true); }}
          onDelete={setDeleting}
        />
      )}

      <Drawer
        open={drawerOpen}
        title={editing ? 'Edit Product' : 'New Product'}
        onClose={closeDrawer}
        footer={
          <div className="flex justify-end gap-3">
            {saveMutation.isError && (
              <p role="alert" className="mr-auto text-sm text-red-600">Something went wrong.</p>
            )}
            <Button variant="secondary" onClick={closeDrawer}>Cancel</Button>
            <Button type="submit" form="product-form" disabled={saveMutation.isPending}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <ProductForm
          key={editing?.productId ?? 'new'}
          product={editing}
          cnyRate={cnyRate}
          onSubmit={handleSubmit}
        />
      </Drawer>

      <ConfirmDialog
        open={deleting != null}
        title="Delete this product?"
        description={deleting?.productName}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.productId)}
      />
    </div>
  );
}
