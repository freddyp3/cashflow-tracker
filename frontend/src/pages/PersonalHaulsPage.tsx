/**
 * Personal hauls tracking page for income/expense cash flow entries.
 * Summary cards (balance, income, expenses) above a newest-first table with
 * running balance. Add entries in a Drawer; delete via ConfirmDialog.
 * No edit — entries are immutable once created.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPersonalHauls, createPersonalHaul, deletePersonalHaul } from '../api/personalHauls';
import type { PersonalHaul } from '../types';
import { Button, ConfirmDialog, Drawer, EmptyState, ErrorState, TableSkeleton, formatMoney } from '../components/ui';
import HaulsSummary from '../components/hauls/HaulsSummary';
import { formatHaulDate, withRunningBalance } from '../components/hauls/haulMath';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

export default function PersonalHaulsPage() {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleting, setDeleting] = useState<PersonalHaul | null>(null);
  const [flowType, setFlowType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');

  const haulsQuery = useQuery({
    queryKey: ['personal-hauls'],
    queryFn: getPersonalHauls,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['personal-hauls'] });

  const createMutation = useMutation({
    mutationFn: createPersonalHaul,
    onSuccess: () => {
      invalidate();
      closeDrawer();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePersonalHaul,
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  function closeDrawer() {
    setDrawerOpen(false);
    setAmount('');
    setNote('');
    setFormError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setFormError('Amount must be greater than 0');
      return;
    }
    setFormError('');
    createMutation.mutate({ flowType, amount: parsed, note: note || null });
  }

  const hauls = haulsQuery.data ?? [];
  const rows = withRunningBalance(hauls).reverse(); // newest first

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Personal Hauls</h1>
        <Button onClick={() => setDrawerOpen(true)}>+ New Entry</Button>
      </div>

      {!haulsQuery.isLoading && !haulsQuery.isError && <HaulsSummary hauls={hauls} />}

      {haulsQuery.isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : haulsQuery.isError ? (
        <ErrorState onRetry={() => haulsQuery.refetch()} />
      ) : hauls.length === 0 ? (
        <EmptyState title="No haul entries yet" />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Balance</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Note</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((h) => (
                <tr key={h.entryTime} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{formatHaulDate(h.entryTime)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        h.flowType === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {h.flowType}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${h.flowType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {h.flowType === 'income' ? '+' : '-'}{formatMoney(h.amount)}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${h.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatMoney(h.balance)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{h.note || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="danger" size="sm" onClick={() => setDeleting(h)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        title="New Haul Entry"
        onClose={closeDrawer}
        footer={
          <div className="flex justify-end gap-3">
            {createMutation.isError && (
              <p role="alert" className="mr-auto text-sm text-red-600">Something went wrong.</p>
            )}
            <Button variant="secondary" onClick={closeDrawer}>Cancel</Button>
            <Button type="submit" form="haul-form" disabled={createMutation.isPending}>Add</Button>
          </div>
        }
      >
        <form id="haul-form" noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="haul-type" className={labelClass}>Type</label>
            <select
              id="haul-type"
              value={flowType}
              onChange={(e) => setFlowType(e.target.value)}
              className={inputClass}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div>
            <label htmlFor="haul-amount" className={labelClass}>Amount (CAD)</label>
            <input
              id="haul-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!formError}
              aria-describedby={formError ? 'haul-amount-error' : undefined}
              className={inputClass}
            />
            {formError && <p id="haul-amount-error" className="text-xs text-red-600 mt-1">{formError}</p>}
          </div>
          <div>
            <label htmlFor="haul-note" className={labelClass}>Note</label>
            <input
              id="haul-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
            />
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={deleting != null}
        title="Delete this entry?"
        description={deleting ? `${formatHaulDate(deleting.entryTime)} · ${deleting.note ?? ''}` : undefined}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.entryTime)}
      />
    </div>
  );
}
