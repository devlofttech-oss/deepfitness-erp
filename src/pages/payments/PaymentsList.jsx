import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getCollection, updateDocument } from '../../firebase/db';
import toast from 'react-hot-toast';

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque'];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

export default function PaymentsList() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPayment, setEditingPayment] = useState(null); // { id, paymentMode, amount, notes }
  const [saving, setSaving] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCollection('payments');
      // Sort newest first
      const sorted = data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setPayments(sorted);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const filtered = payments.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.memberName?.toLowerCase().includes(term) ||
      p.planName?.toLowerCase().includes(term) ||
      p.paymentMode?.toLowerCase().includes(term)
    );
  });

  const openEdit = (payment) => {
    setEditingPayment({
      id: payment.id,
      paymentMode: payment.paymentMode || 'Cash',
      amount: payment.amount || 0,
      notes: payment.notes || '',
    });
  };

  const handleEditSave = async () => {
    if (!editingPayment) return;
    try {
      setSaving(true);
      await updateDocument('payments', editingPayment.id, {
        paymentMode: editingPayment.paymentMode,
        amount: Number(editingPayment.amount),
        notes: editingPayment.notes,
      });
      toast.success('Payment updated!');
      setEditingPayment(null);
      fetchPayments();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update payment');
    } finally {
      setSaving(false);
    }
  };

  const modeColors = {
    Cash: 'bg-emerald-100 text-emerald-700',
    Card: 'bg-blue-100 text-blue-700',
    UPI: 'bg-purple-100 text-purple-700',
    'Bank Transfer': 'bg-amber-100 text-amber-700',
    Cheque: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-h1 text-h1 text-on-surface">Payments</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">View, edit, and track all member payments.</p>
        </div>
        <Link
          to="/payments/new"
          className="bg-primary text-on-primary px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Record Payment
        </Link>
      </div>

      {/* Revenue Summary */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)] p-6 flex flex-wrap gap-8">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Revenue</span>
          <span className="text-3xl font-bold text-emerald-600">₹{totalRevenue.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Total Payments</span>
          <span className="text-3xl font-bold text-on-surface">{payments.length}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">This Month</span>
          <span className="text-3xl font-bold text-on-surface">
            {payments.filter(p => {
              if (!p.date) return false;
              const d = new Date(p.date);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 max-w-md shadow-sm">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
        <input
          type="text"
          placeholder="Search by member, plan, mode..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent text-on-surface outline-none text-sm placeholder:text-on-surface-variant"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Member</th>
                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Plan</th>
                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Active From</th>
                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Expiry</th>
                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Amount</th>
                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Mode</th>
                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Date</th>
                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin text-2xl mr-2">progress_activity</span>
                    Loading payments...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-5xl opacity-40">receipt_long</span>
                      <p className="font-medium">No payments found</p>
                      <Link to="/payments/new" className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                        Record First Payment
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(payment => (
                  <tr key={payment.id} className="border-b border-outline-variant/20 hover:bg-surface-container/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {payment.memberName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-on-surface text-sm">{payment.memberName || '—'}</div>
                          <div className="text-xs text-on-surface-variant">{payment.memberPhone || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-on-surface-variant">{payment.planName || '—'}</td>
                    <td className="p-4 text-sm text-on-surface-variant">{formatDate(payment.planActiveFrom)}</td>
                    <td className="p-4 text-sm text-on-surface-variant">{formatDate(payment.expiryDate)}</td>
                    <td className="p-4">
                      <span className="font-bold text-emerald-600">₹{Number(payment.amount || 0).toLocaleString('en-IN')}</span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${modeColors[payment.paymentMode] || 'bg-slate-100 text-slate-600'}`}>
                        {payment.paymentMode || 'Cash'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-on-surface-variant">{formatDate(payment.date)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openEdit(payment)}
                        className="text-primary hover:text-primary/80 font-medium text-sm flex items-center gap-1 ml-auto transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit</span>
                Edit Payment
              </h2>
              <button
                onClick={() => setEditingPayment(null)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-on-surface-variant">Payment Mode</label>
                <select
                  value={editingPayment.paymentMode}
                  onChange={e => setEditingPayment(prev => ({ ...prev, paymentMode: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface outline-none focus:border-primary transition-all appearance-none"
                >
                  {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-on-surface-variant">Amount (₹)</label>
                <input
                  type="number"
                  value={editingPayment.amount}
                  onChange={e => setEditingPayment(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-on-surface-variant">Notes</label>
                <input
                  type="text"
                  value={editingPayment.notes}
                  onChange={e => setEditingPayment(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Paid via PhonePe"
                  className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg text-on-surface outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="px-4 py-2 rounded-lg font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="px-5 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70"
              >
                {saving ? (
                  <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Saving...</>
                ) : (
                  <><span className="material-symbols-outlined text-[16px]">save</span> Save Changes</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
