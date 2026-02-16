/**
 * Personal hauls tracking page for income/expense cash flow entries.
 * Displays entries sorted by time with a running balance column.
 * Inline form for adding new entries (income or expense type).
 * Delete action with confirmation. No edit — entries are immutable once created.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPersonalHauls, createPersonalHaul, deletePersonalHaul } from '../api/personalHauls';

export default function PersonalHaulsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [flowType, setFlowType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const { data: hauls = [], isLoading } = useQuery({
    queryKey: ['personal-hauls'],
    queryFn: getPersonalHauls,
  });

  const createMutation = useMutation({
    mutationFn: createPersonalHaul,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-hauls'] });
      setShowForm(false);
      setAmount('');
      setNote('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePersonalHaul,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['personal-hauls'] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      flowType,
      amount: parseFloat(amount),
      note: note || null,
    });
  }

  // Running balance
  let balance = 0;
  const sorted = [...hauls].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());
  const withBalance = sorted.map((h) => {
    balance += h.flowType === 'income' ? h.amount : -h.amount;
    return { ...h, balance };
  });

  if (isLoading) {
    return <p className="text-gray-400">Loading hauls...</p>;
  }

  const inputClass =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Personal Hauls</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-600 transition-colors"
          >
            + New Entry
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">New Haul Entry</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={flowType} onChange={(e) => setFlowType(e.target.value)} className={inputClass}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (CAD)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-600 transition-colors">
              Add
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
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
            {withBalance.map((h) => (
              <tr key={h.entryTime} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">
                  {new Date(h.entryTime).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    h.flowType === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {h.flowType}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-medium ${
                  h.flowType === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {h.flowType === 'income' ? '+' : '-'}${h.amount.toFixed(2)}
                </td>
                <td className={`px-4 py-3 text-right font-medium ${h.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${h.balance.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-gray-500">{h.note || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => { if (confirm('Delete this entry?')) deleteMutation.mutate(h.entryTime); }}
                    className="text-red-500 hover:text-red-600 font-medium text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {hauls.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No haul entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
