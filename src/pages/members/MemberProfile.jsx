import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDocument, getCollection, updateDocument } from '../../firebase/db';
import toast from 'react-hot-toast';

export default function MemberProfile() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const profileData = await getDocument('members', id);
        setMember(profileData);
        setEditForm({ name: profileData?.name || '', phone: profileData?.phone || '' });
        
        // Fetch payments
        const paymentsData = await getCollection('payments', [{ field: 'memberId', op: '==', value: id }]);
        const sortedPayments = paymentsData.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setPayments(sortedPayments);
      } catch (error) {
        console.error("Error fetching data", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateDocument('members', id, { name: editForm.name, phone: editForm.phone });
      setMember(prev => ({ ...prev, name: editForm.name, phone: editForm.phone }));
      setIsEditing(false);
      toast.success('Member updated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update member.');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-on-surface-variant font-medium">Loading profile...</div>;
  }

  if (!member) {
    return <div className="p-8 text-center text-error font-medium">Member not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Profile Card */}
      <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-24 h-24 rounded-full bg-primary-container text-primary flex items-center justify-center text-4xl font-bold shadow-inner">
            {member.name?.charAt(0) || '?'}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-h2 text-h2 text-on-surface">{member.name}</h1>
            <div className="flex items-center gap-4 text-on-surface-variant text-sm mt-1">
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">call</span> {member.phone}</span>
              <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">calendar_month</span> Joined {member.joinDate}</span>
            </div>
            <div className="mt-2">
              {member.status === 'Active' ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-label-caps text-label-caps bg-emerald-50 px-2 py-1 rounded-md">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Active Member
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-600 font-label-caps text-label-caps bg-rose-50 px-2 py-1 rounded-md">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> Expired Member
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 relative z-10 w-full md:w-auto">
          <Link to={`/payments/new?memberId=${id}`} className="flex-1 md:flex-none bg-primary text-on-primary px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm text-center flex items-center justify-center gap-1.5">
            Collect Payment
          </Link>
          <button onClick={() => setIsEditing(true)} className="flex-1 md:flex-none bg-surface-container border border-outline-variant/30 text-on-surface px-5 py-2.5 rounded-lg font-medium hover:bg-surface-container-high transition-colors shadow-sm">
            Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col - Current Plan Details */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)]">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">card_membership</span>
              <h3 className="font-h3 text-h3 text-on-surface">Current Plan</h3>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="bg-primary-container/20 rounded-xl p-4 border border-primary/10">
                <div className="text-xs font-label-caps text-primary uppercase tracking-wider mb-1">Plan Name</div>
                <div className="font-h3 text-on-surface">{member.planName || 'No Active Plan'}</div>
              </div>
              
              <div className="flex flex-col gap-1">
                <div className="text-sm text-on-surface-variant font-medium">Plan Active From</div>
                <div className="font-medium text-on-surface">{member.planActiveFrom || member.joinDate || 'N/A'}</div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-sm text-on-surface-variant font-medium">Valid Until</div>
                <div className="font-medium text-on-surface text-lg">{member.expiryDate || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)]">
             <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-secondary">trending_up</span>
              <h3 className="font-h3 text-h3 text-on-surface">Quick Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="flex flex-col gap-1 p-3 bg-surface-container rounded-lg">
                 <span className="text-xs text-on-surface-variant font-medium">Visits This Month</span>
                 <span className="text-xl font-bold text-on-surface">12</span>
               </div>
               <div className="flex flex-col gap-1 p-3 bg-surface-container rounded-lg">
                 <span className="text-xs text-on-surface-variant font-medium">Lifetime Value</span>
                 <span className="text-xl font-bold text-on-surface">$450</span>
               </div>
            </div>
          </div>
        </div>

        {/* Right Col - Activity & History */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)] flex-1">
            <h3 className="font-h3 text-h3 text-on-surface mb-6">Payment History</h3>
            
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl opacity-50 mb-2">receipt_long</span>
                <p>No payment history found yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {payments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-4 rounded-xl bg-surface-container border border-outline-variant/30">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-on-surface">{payment.planName}</span>
                      <span className="text-xs text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        {payment.planActiveFrom ? `Active: ${payment.planActiveFrom}` : (payment.date ? new Date(payment.date).toLocaleDateString('en-IN') : '—')}
                        {payment.expiryDate && <span className="ml-1">→ {payment.expiryDate}</span>}
                      </span>
                      {payment.notes && <span className="text-xs text-on-surface-variant italic">{payment.notes}</span>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">₹{Number(payment.amount || 0).toLocaleString('en-IN')}</span>
                      <span className="text-xs bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full font-medium">{payment.paymentMode || 'Cash'}</span>
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium border border-emerald-200 dark:border-emerald-800/50">Paid</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-on-surface mb-6">Edit Member</h2>
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-on-surface-variant">Full Name</label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-on-surface-variant">Phone Number</label>
                <input 
                  type="tel" 
                  value={editForm.phone} 
                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  className="px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg font-medium text-on-surface-variant hover:bg-surface-container transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
