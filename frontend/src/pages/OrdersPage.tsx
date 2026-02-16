/**
 * Order management page with full CRUD.
 * Lists all orders in a table with Edit/Delete actions.
 * Toggle-able inline form for creating or editing orders with nested line items.
 * The order form supports multi-currency input with live CAD conversion.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, createOrder, updateOrder, deleteOrder } from '../api/orders';
import type { Order, OrderRequest } from '../types';
import OrderList from '../components/orders/OrderList';
import OrderForm from '../components/orders/OrderForm';

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Order | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: OrderRequest }) => updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setEditing(null);
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });

  function handleSubmit(data: OrderRequest) {
    if (editing) {
      updateMutation.mutate({ id: editing.orderId, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function handleEdit(order: Order) {
    setEditing(order);
    setShowForm(true);
  }

  function handleDelete(id: number) {
    if (confirm('Delete this order?')) {
      deleteMutation.mutate(id);
    }
  }

  if (isLoading) {
    return <p className="text-gray-400">Loading orders...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        {!showForm && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-600 transition-colors"
          >
            + New Order
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <OrderForm
            order={editing}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        </div>
      )}

      <OrderList orders={orders} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
