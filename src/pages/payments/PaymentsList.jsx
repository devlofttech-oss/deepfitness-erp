import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getCollection, updateDocument } from '../../firebase/db';
import toast from 'react-hot-toast';

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque'];
const TABS = [
  { id: 'payments', label: 'All Payments', icon: 'receipt_long' },
  { id: 'dues', label: 'Dues & Expired', icon: 'warning' },
];

const MESSAGE_TEMPLATES = [
  {
    id: 'expired',
    label: 'Membership Expired',
    icon: 'event_busy',
    getText: (name, expiry) =>
      `Hi ${name}! 👋\n\nYour *Deep Fitness* membership has expired on *${expiry || 'N/A'}*.\n\nRenew your plan today to continue your fitness journey! 💪\n\nVisit us or contact us to renew.\n\n— Deep Fitness Team`,
  },
  {
    id: 'unpaid',
    label: 'Payment Due',
    icon: 'payments',
    getText: (name) =>
      `Hi ${name}! 👋\n\nThis is a friendly reminder that your *Deep Fitness* membership payment is due.\n\nPlease clear your dues at the earliest to avoid any interruption in your fitness sessions. 🏋️\n\n— Deep Fitness Team`,
  },
  {
    id: 'renew',
    label: 'Renewal Offer',
    icon: 'card_membership',
    getText: (name) =>
      `Hi ${name}! 🌟\n\nWe miss you at *Deep Fitness*! Your membership has expired and we'd love to have you back.\n\n💥 *Special Renewal Offer* — visit us today for exclusive renewal discounts!\n\nDon't miss out. Your fitness journey awaits! 💪\n\n— Deep Fitness Team`,
  },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
}

function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate); exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
}

function buildWhatsAppLink(phone, message) {
  const cleaned = String(phone).replace(/\D/g, '');
  const withCountry = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

// ── Send Message Modal ───────────────────────────────────────────────────────
function SendMessageModal({ member, onClose }) {
  const [selectedTemplate, setSelectedTemplate] = useState(MESSAGE_TEMPLATES[0].id);
  const [customMessage, setCustomMessage] = useState('');

  const template = MESSAGE_TEMPLATES.find(t => t.id === selectedTemplate);
  const generatedText = template ? template.getText(member.name, member.expiryDate) : '';
  const finalMessage = customMessage || generatedText;

  useEffect(() => {
    setCustomMessage('');
  }, [selectedTemplate]);

  const handleSend = () => {
    if (!member.phone) { toast.error('No phone number for this member'); return; }
    const url = buildWhatsAppLink(member.phone, finalMessage);
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor" className="w-5 h-5 text-green-600">
                <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.737 5.469 2.026 7.769L0 32l8.476-2.003A15.944 15.944 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.279 13.279 0 01-6.77-1.848l-.484-.289-5.03 1.188 1.22-4.898-.317-.503A13.302 13.302 0 012.667 16C2.667 8.637 8.637 2.667 16 2.667S29.333 8.637 29.333 16 23.363 29.333 16 29.333zm7.306-9.984c-.4-.2-2.368-1.168-2.735-1.302-.368-.133-.636-.2-.904.2-.267.4-1.036 1.302-1.27 1.569-.234.267-.468.3-.868.1-.4-.2-1.688-.622-3.215-1.984-1.188-1.06-1.99-2.369-2.224-2.769-.234-.4-.025-.616.175-.815.181-.18.4-.468.601-.702.2-.233.267-.4.4-.667.134-.267.067-.5-.033-.7-.1-.2-.904-2.18-1.237-2.985-.326-.785-.657-.678-.904-.69l-.768-.013c-.267 0-.7.1-1.068.5-.367.4-1.403 1.37-1.403 3.344s1.437 3.878 1.637 4.145c.2.267 2.827 4.315 6.851 6.051.957.413 1.704.66 2.286.845.96.306 1.835.263 2.525.16.77-.115 2.368-.969 2.702-1.904.334-.936.334-1.737.234-1.904-.1-.167-.367-.267-.767-.467z"/>
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-on-surface">Send WhatsApp Message</h2>
              <p className="text-xs text-on-surface-variant">To: {member.name} · {member.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5 flex-1 overflow-y-auto">
          {/* Template Selector */}
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Choose Template</p>
            <div className="flex flex-col gap-2">
              {MESSAGE_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    selectedTemplate === t.id
                      ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                      : 'border-outline-variant/30 hover:bg-surface-container'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${
                    selectedTemplate === t.id ? 'text-green-600' : 'text-on-surface-variant'
                  }`} style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                  <span className={`text-sm font-medium ${
                    selectedTemplate === t.id ? 'text-green-700 dark:text-green-400' : 'text-on-surface'
                  }`}>{t.label}</span>
                  {selectedTemplate === t.id && (
                    <span className="material-symbols-outlined text-green-500 text-[16px] ml-auto">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Message Preview / Edit */}
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Message Preview</p>
            <textarea
              rows={8}
              value={customMessage || generatedText}
              onChange={e => setCustomMessage(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container border border-outline-variant/30 rounded-xl text-on-surface text-sm outline-none focus:border-green-400 transition-all resize-none leading-relaxed"
              placeholder="Type your message..."
            />
            {customMessage && (
              <button
                onClick={() => setCustomMessage('')}
                className="text-xs text-primary hover:underline mt-1"
              >
                Reset to template
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-outline-variant/20">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!member.phone}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor" className="w-4 h-4">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.737 5.469 2.026 7.769L0 32l8.476-2.003A15.944 15.944 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.279 13.279 0 01-6.77-1.848l-.484-.289-5.03 1.188 1.22-4.898-.317-.503A13.302 13.302 0 012.667 16C2.667 8.637 8.637 2.667 16 2.667S29.333 8.637 29.333 16 23.363 29.333 16 29.333zm7.306-9.984c-.4-.2-2.368-1.168-2.735-1.302-.368-.133-.636-.2-.904.2-.267.4-1.036 1.302-1.27 1.569-.234.267-.468.3-.868.1-.4-.2-1.688-.622-3.215-1.984-1.188-1.06-1.99-2.369-2.224-2.769-.234-.4-.025-.616.175-.815.181-.18.4-.468.601-.702.2-.233.267-.4.4-.667.134-.267.067-.5-.033-.7-.1-.2-.904-2.18-1.237-2.985-.326-.785-.657-.678-.904-.69l-.768-.013c-.267 0-.7.1-1.068.5-.367.4-1.403 1.37-1.403 3.344s1.437 3.878 1.637 4.145c.2.267 2.827 4.315 6.851 6.051.957.413 1.704.66 2.286.845.96.306 1.835.263 2.525.16.77-.115 2.368-.969 2.702-1.904.334-.936.334-1.737.234-1.904-.1-.167-.367-.267-.767-.467z"/>
            </svg>
            Open in WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
// ────────────────────────────────────────────────────────────────────────────

export default function PaymentsList() {
  const [activeTab, setActiveTab] = useState('payments');
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPayment, setEditingPayment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [messageMember, setMessageMember] = useState(null); // member to send message to

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [payData, memData] = await Promise.all([
        getCollection('payments'),
        getCollection('members'),
      ]);
      const sorted = payData.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setPayments(sorted);
      setMembers(memData);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const filteredPayments = payments.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.memberName?.toLowerCase().includes(term) ||
      p.planName?.toLowerCase().includes(term) ||
      p.paymentMode?.toLowerCase().includes(term)
    );
  });

  // Dues: expired or no plan members
  const duesMembers = members.filter(m => {
    const days = daysUntilExpiry(m.expiryDate);
    return m.status === 'Expired' || (days !== null && days < 0) || !m.planName;
  });

  const filteredDues = duesMembers.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return m.name?.toLowerCase().includes(term) || m.phone?.includes(term);
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
      fetchData();
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
          <p className="font-body-lg text-body-lg text-on-surface-variant">Track payments, dues, and expired memberships.</p>
        </div>
        <Link
          to="/payments/new"
          className="bg-primary text-on-primary px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Record Payment
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            {tab.label}
            {tab.id === 'dues' && duesMembers.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {duesMembers.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── PAYMENTS TAB ─── */}
      {activeTab === 'payments' && (
        <>
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
                  ) : filteredPayments.length === 0 ? (
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
                    filteredPayments.map(payment => (
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
        </>
      )}

      {/* ─── DUES TAB ─── */}
      {activeTab === 'dues' && (
        <>
          {/* Alert Banner */}
          {!loading && duesMembers.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700/40 rounded-2xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-rose-500 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              <div>
                <p className="font-semibold text-rose-700 dark:text-rose-300">{duesMembers.length} member{duesMembers.length > 1 ? 's' : ''} with expired or missing memberships</p>
                <p className="text-sm text-rose-600 dark:text-rose-400 mt-0.5">Send WhatsApp reminders or renew their plans directly.</p>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 max-w-md shadow-sm">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
            <input
              type="text"
              placeholder="Search by name or phone..."
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

          {/* Dues Table */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
                    <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Member</th>
                    <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Phone</th>
                    <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Last Plan</th>
                    <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Expired On</th>
                    <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Overdue</th>
                    <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined animate-spin text-2xl mr-2">progress_activity</span>
                        Loading dues...
                      </td>
                    </tr>
                  ) : filteredDues.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-12 text-center">
                        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                          <span className="material-symbols-outlined text-5xl opacity-40">check_circle</span>
                          <p className="font-medium text-emerald-600">No dues! All members are up to date.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDues.map(member => {
                      const days = daysUntilExpiry(member.expiryDate);
                      const overdueDays = days !== null ? Math.abs(days) : null;
                      return (
                        <tr key={member.id} className="border-b border-outline-variant/20 hover:bg-surface-container/40 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                {member.name?.charAt(0) || '?'}
                              </div>
                              <div className="font-medium text-on-surface text-sm">{member.name || '—'}</div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-on-surface-variant">{member.phone || '—'}</td>
                          <td className="p-4 text-sm text-on-surface-variant">{member.planName || <span className="text-on-surface-variant/50 italic">No plan</span>}</td>
                          <td className="p-4">
                            <span className="text-sm font-medium text-rose-600 dark:text-rose-400">
                              {member.expiryDate ? formatDate(member.expiryDate) : '—'}
                            </span>
                          </td>
                          <td className="p-4">
                            {overdueDays !== null ? (
                              <span className="flex items-center gap-1 text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400 text-xs font-semibold px-2.5 py-1 rounded-full w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
                                {overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue
                              </span>
                            ) : (
                              <span className="text-xs text-on-surface-variant/60 italic">—</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              {/* Send Message button → opens modal with template picker */}
                              <button
                                onClick={() => setMessageMember(member)}
                                className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                                title={`Send WhatsApp message to ${member.name}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor" className="w-3.5 h-3.5">
                                  <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.737 5.469 2.026 7.769L0 32l8.476-2.003A15.944 15.944 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.279 13.279 0 01-6.77-1.848l-.484-.289-5.03 1.188 1.22-4.898-.317-.503A13.302 13.302 0 012.667 16C2.667 8.637 8.637 2.667 16 2.667S29.333 8.637 29.333 16 23.363 29.333 16 29.333zm7.306-9.984c-.4-.2-2.368-1.168-2.735-1.302-.368-.133-.636-.2-.904.2-.267.4-1.036 1.302-1.27 1.569-.234.267-.468.3-.868.1-.4-.2-1.688-.622-3.215-1.984-1.188-1.06-1.99-2.369-2.224-2.769-.234-.4-.025-.616.175-.815.181-.18.4-.468.601-.702.2-.233.267-.4.4-.667.134-.267.067-.5-.033-.7-.1-.2-.904-2.18-1.237-2.985-.326-.785-.657-.678-.904-.69l-.768-.013c-.267 0-.7.1-1.068.5-.367.4-1.403 1.37-1.403 3.344s1.437 3.878 1.637 4.145c.2.267 2.827 4.315 6.851 6.051.957.413 1.704.66 2.286.845.96.306 1.835.263 2.525.16.77-.115 2.368-.969 2.702-1.904.334-.936.334-1.737.234-1.904-.1-.167-.367-.267-.767-.467z"/>
                                </svg>
                                Message
                              </button>
                              <Link
                                to={`/payments/new?memberId=${member.id}`}
                                className="bg-primary text-on-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors shadow-sm flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">payments</span>
                                Renew
                              </Link>
                              <Link
                                to={`/members/${member.id}`}
                                className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg font-medium text-xs transition-colors"
                              >
                                View
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {!loading && filteredDues.length > 0 && (
              <div className="px-4 py-3 border-t border-outline-variant/20 text-xs text-on-surface-variant">
                Showing {filteredDues.length} member{filteredDues.length !== 1 ? 's' : ''} with dues
              </div>
            )}
          </div>
        </>
      )}

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

      {/* Send WhatsApp Message Modal */}
      {messageMember && (
        <SendMessageModal
          member={messageMember}
          onClose={() => setMessageMember(null)}
        />
      )}
    </div>
  );
}
