import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createOrder, deleteOrder, getOrders, updateOrder } from '../api/orders';
import { getPlatforms } from '../api/meta';
import type { Order, OrderRequest } from '../types';
import OrderForm from '../components/orders/OrderForm';
import OrderList from '../components/orders/OrderList';
import { useOrderTable } from '../components/orders/useOrderTable';
import type { SortKey } from '../components/orders/useOrderTable';
import { Button, ConfirmDialog, Drawer, EmptyState, ErrorState, TableSkeleton } from '../components/ui';

const inputClass =
  'rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Order | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleting, setDeleting] = useState<Order | null>(null);
  const [draftSubmit, setDraftSubmit] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const ordersQuery = useQuery({ queryKey: ['orders'], queryFn: () => getOrders() });
  const platformsQuery = useQuery({ queryKey: ['meta-platforms'], queryFn: getPlatforms });

  const orders = ordersQuery.data ?? [];
  const { state, setState, onSort, filtered } = useOrderTable(orders);

  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      closeDrawer();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: OrderRequest }) => updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      closeDrawer();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setDeleting(null);
    },
  });

  function closeDrawer() {
    setDrawerOpen(false);
    setEditing(null);
    setDraftSubmit(false);
  }

  function handleSubmit(data: OrderRequest) {
    if (editing) {
      updateMutation.mutate({ id: editing.orderId, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const mutationError = (createMutation.error ?? updateMutation.error) as Error | null;
  const submitLabel = draftSubmit ? 'Save Draft' : editing ? 'Update' : 'Create';

  if (ordersQuery.isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Orders</h1>
        <TableSkeleton rows={6} cols={8} />
      </div>
    );
  }

  if (ordersQuery.isError) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Orders</h1>
        <ErrorState onRetry={() => void ordersQuery.refetch()} />
      </div>
    );
  }

  const unfiltered =
    state.search.trim() === '' && state.platform === '' && state.status === 'all';

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Orders</h1>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="search"
          placeholder="Search customer, note, product…"
          aria-label="Search orders"
          value={state.search}
          onChange={(e) => setState((s) => ({ ...s, search: e.target.value }))}
          className={inputClass}
        />
        <select
          aria-label="Platform"
          value={state.platform}
          onChange={(e) => setState((s) => ({ ...s, platform: e.target.value }))}
          className={inputClass}
        >
          <option value="">All platforms</option>
          {(platformsQuery.data ?? []).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          aria-label="Status"
          value={state.status}
          onChange={(e) => setState((s) => ({ ...s, status: e.target.value as typeof s.status }))}
          className={inputClass}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="disputed">Disputed</option>
        </select>
        <Button onClick={() => { setEditing(null); setDraftSubmit(false); setDrawerOpen(true); }}>
          + New Order
        </Button>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Create your first order to get started."
          action={
            <Button onClick={() => { setEditing(null); setDraftSubmit(false); setDrawerOpen(true); }}>
              + New Order
            </Button>
          }
        />
      ) : filtered.length === 0 && !unfiltered ? (
        <EmptyState title="No orders match your filters" />
      ) : (
        <OrderList
          orders={filtered}
          sortKey={state.sortKey}
          sortDir={state.sortDir}
          onSort={(key: SortKey) => onSort(key)}
          onEdit={(o) => { setEditing(o); setDraftSubmit(o.draft); setDrawerOpen(true); }}
          onDelete={setDeleting}
          expandedId={expandedId}
          onToggleExpand={(id) => setExpandedId((cur) => (cur === id ? null : id))}
        />
      )}

      <Drawer
        open={drawerOpen}
        title={editing ? 'Edit Order' : 'New Order'}
        onClose={closeDrawer}
        footer={
          <div className="flex items-center justify-between gap-3">
            {mutationError ? (
              <p role="alert" className="text-sm text-red-600">{mutationError.message}</p>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={closeDrawer}>Cancel</Button>
              <Button type="submit" form="order-form">{submitLabel}</Button>
            </div>
          </div>
        }
      >
        <OrderForm
          key={editing?.orderId ?? 'new'}
          order={editing}
          platforms={platformsQuery.data ?? []}
          onSubmit={handleSubmit}
          onDraftChange={setDraftSubmit}
        />
      </Drawer>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this order?"
        description={deleting ? `#${deleting.orderId} · ${deleting.platform} · ${deleting.customerName}` : undefined}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.orderId)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
