import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getCollection, createDocument, updateDocument } from '../../firebase/db';
import toast from 'react-hot-toast';

const DEFAULT_PLANS = [
  { name: '1 Month Basic',  durationDays: 30,  amount: 1500 },
  { name: '3 Months Pro',   durationDays: 90,  amount: 4000 },
  { name: '6 Months Elite', durationDays: 180, amount: 7000 },
  { name: '1 Year Master',  durationDays: 365, amount: 12000 },
];

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMemberId = searchParams.get('memberId') || '';

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [plans, setPlans] = useState(DEFAULT_PLANS);

  const [formData, setFormData] = useState({
    memberId: initialMemberId,
    planName: DEFAULT_PLANS[0].name,
    durationDays: DEFAULT_PLANS[0].durationDays,
    amount: DEFAULT_PLANS[0].amount,
    paymentMode: 'Cash',
    planActiveFrom: today,
    expiryDate: addDays(today, DEFAULT_PLANS[0].durationDays),
    notes: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const doc = await import('../../firebase/db').then(m => m.getDocument('settings', 'general'));
        if (doc && doc.plans && doc.plans.length > 0) {
          setPlans(doc.plans);
          setFormData(prev => ({
            ...prev,
            planName: doc.plans[0].name,
            durationDays: doc.plans[0].durationDays,
            amount: doc.plans[0].amount,
            expiryDate: addDays(prev.planActiveFrom, doc.plans[0].durationDays),
          }));
        }
      } catch (error) {
        console.error("Failed to load plans", error);
      }
    };
    fetchSettings();
  }, []);

  // Recalculate expiry when planActiveFrom or durationDays changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      expiryDate: addDays(prev.planActiveFrom, prev.durationDays),
    }));
  }, [formData.planActiveFrom, formData.durationDays]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const data = await getCollection('members');
        setMembers(data);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load members');
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePlanChange = (e) => {
    const plan = plans.find(p => p.name === e.target.value);
    if (!plan) return;
    setFormData(prev => ({
      ...prev,
      planName: plan.name,
      durationDays: plan.durationDays,
      amount: plan.amount,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.memberId) { toast.error('Please select a member'); return; }

    const selectedMember = members.find(m => m.id === formData.memberId);

    try {
      setSaving(true);

      // 1. Create Payment Record in Firestore
      await createDocument('payments', {
        memberId: formData.memberId,
        memberName: selectedMember?.name || '',
        memberPhone: selectedMember?.phone || '',
        planName: formData.planName,
        planActiveFrom: formData.planActiveFrom,
        expiryDate: formData.expiryDate,
        amount: Number(formData.amount),
        paymentMode: formData.paymentMode,
        notes: formData.notes,
        date: new Date().toISOString(),
        status: 'Paid',
      });

      // 2. Update Member with new plan + expiry
      await updateDocument('members', formData.memberId, {
        planName: formData.planName,
        planActiveFrom: formData.planActiveFrom,
        expiryDate: formData.expiryDate,
        status: 'Active',
      });

      toast.success('Payment recorded & member plan updated!');
      navigate(`/members/${formData.memberId}`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to process payment');
    } finally {
      setSaving(false);
    }
  };

  const daysRemaining = Math.round(
    (new Date(formData.expiryDate) - new Date(formData.planActiveFrom)) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/payments"
          className="w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors text-on-surface"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <div className="flex flex-col">
          <h1 className="font-h2 text-h2 text-on-surface">Record Payment</h1>
          <p className="text-sm text-on-surface-variant">Process a subscription payment and activate member plan</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {/* Member Select */}
          <div className="flex flex-col gap-2">
            <label className="font-medium text-sm text-on-surface">
              Select Member <span className="text-error">*</span>
            </label>
            <select
              required
              name="memberId"
              value={formData.memberId}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface outline-none appearance-none"
            >
              <option value="">-- Choose Member --</option>
              {loadingMembers
                ? <option disabled>Loading...</option>
                : members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                  ))
              }
            </select>
          </div>

          <div className="border-t border-outline-variant/20" />

          {/* Plan + Amount */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">card_membership</span>
              Plan Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm text-on-surface">Membership Plan</label>
                <select
                  name="planName"
                  value={formData.planName}
                  onChange={handlePlanChange}
                  className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface outline-none appearance-none"
                >
                  {plans.map(p => (
                    <option key={p.name} value={p.name}>{p.name} — ₹{Number(p.amount).toLocaleString()}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm text-on-surface">Amount (₹)</label>
                <input
                  required
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm text-on-surface">Payment Mode</label>
                <select
                  name="paymentMode"
                  value={formData.paymentMode}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface outline-none appearance-none"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm text-on-surface">Notes (optional)</label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="e.g. Renewal, Annual offer"
                  className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface outline-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-outline-variant/20" />

          {/* Plan Active Dates */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              Plan Duration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm text-on-surface">
                  Plan Active From
                  <span className="ml-1 text-xs text-on-surface-variant font-normal">(plan starts this date)</span>
                </label>
                <input
                  type="date"
                  name="planActiveFrom"
                  value={formData.planActiveFrom}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-medium text-sm text-on-surface">
                  Expiry Date
                  <span className="ml-1 text-xs text-on-surface-variant font-normal">(auto-calculated)</span>
                </label>
                <input
                  type="date"
                  name="expiryDate"
                  value={formData.expiryDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface outline-none"
                />
              </div>
            </div>
          </div>

          {/* Preview Banner */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
            <span className="material-symbols-outlined text-primary text-2xl">event_available</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-on-surface">
                Plan Active: <span className="text-primary">{formData.planActiveFrom}</span>
                &nbsp;→&nbsp;
                <span className="text-primary">{formData.expiryDate}</span>
                &nbsp;<span className="text-on-surface-variant font-normal">({daysRemaining} days)</span>
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Member status will be set to <strong>Active</strong> and expiry updated automatically.
              </p>
            </div>
          </div>

          <div className="border-t border-outline-variant/30 pt-6 flex justify-end gap-3">
            <Link
              to="/payments"
              className="px-5 py-2.5 rounded-lg text-on-surface-variant font-medium hover:bg-surface-container transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || loadingMembers}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  Processing...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  Process Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
