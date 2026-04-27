import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDocument, getCollection, updateDocument } from '../../firebase/db';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

// ── Attendance Calendar ─────────────────────────────────────────────────────
function AttendanceCalendar({ attendance }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // Build set of attended date strings "YYYY-MM-DD"
  const attendedDates = new Set(
    attendance.map(a => {
      const d = new Date(a.timestamp || a.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isAttended = (d) => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return attendedDates.has(key);
  };

  const thisMonthCount = [...attendedDates].filter(k => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length;

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="select-none">
      {/* Month Nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container text-on-surface-variant transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <div className="text-center">
          <div className="font-semibold text-on-surface">{monthName}</div>
          <div className="text-xs text-on-surface-variant mt-0.5">{thisMonthCount} visit{thisMonthCount !== 1 ? 's' : ''} this month</div>
        </div>
        <button
          onClick={nextMonth}
          disabled={month === today.getMonth() && year === today.getFullYear()}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container text-on-surface-variant transition-colors disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 mb-1">
        {days.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-on-surface-variant uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for first week offset */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const attended = isAttended(day);
          const todayDay = isToday(day);
          return (
            <div
              key={day}
              className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all
                ${attended ? 'bg-primary text-on-primary shadow-sm scale-105' : 'text-on-surface-variant hover:bg-surface-container'}
                ${todayDay && !attended ? 'ring-2 ring-primary/40 text-primary font-bold' : ''}
                ${todayDay && attended ? 'ring-2 ring-white/50' : ''}
              `}
              title={attended ? `Visited on ${day} ${monthName}` : ''}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 justify-end">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary"></div>
          <span className="text-[11px] text-on-surface-variant">Attended</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-primary/40"></div>
          <span className="text-[11px] text-on-surface-variant">Today</span>
        </div>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function MemberProfile() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [attendanceTab, setAttendanceTab] = useState('calendar'); // 'calendar' | 'list'
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef(null);

  const printQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>QR Code - ${member?.name}</title>
      <style>
        body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
        .card { border: 2px solid #7c3aed; border-radius: 16px; padding: 24px; text-align: center; max-width: 300px; }
        h2 { margin: 12px 0 4px; color: #1e1b4b; font-size: 20px; }
        p { margin: 0; color: #6b7280; font-size: 13px; }
        .gym { font-size: 11px; color: #7c3aed; font-weight: 600; margin-top: 8px; letter-spacing: 1px; }
      </style></head>
      <body><div class="card">${svgData}<h2>${member?.name}</h2><p>${member?.phone || ''}</p><p class="gym">DEEP FITNESS</p></div></body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const profileData = await getDocument('members', id);
        setMember(profileData);
        setEditForm({ name: profileData?.name || '', phone: profileData?.phone || '' });

        const paymentsData = await getCollection('payments', [{ field: 'memberId', op: '==', value: id }]);
        const sortedPayments = paymentsData.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setPayments(sortedPayments);

        const attendanceData = await getCollection('attendance', [{ field: 'memberId', op: '==', value: id }]);
        const sortedAttendance = attendanceData.sort((a, b) => new Date(b.timestamp || b.date || 0) - new Date(a.timestamp || a.date || 0));
        setAttendance(sortedAttendance);
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

  // Stats
  const now = new Date();
  const thisMonth = attendance.filter(a => {
    const d = new Date(a.timestamp || a.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

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
        {/* Left Col */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Current Plan */}
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

          {/* Quick Stats */}
          <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)]">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-secondary">trending_up</span>
              <h3 className="font-h3 text-h3 text-on-surface">Quick Stats</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 p-3 bg-surface-container rounded-lg">
                <span className="text-xs text-on-surface-variant font-medium">Total Visits</span>
                <span className="text-xl font-bold text-on-surface">{attendance.length}</span>
              </div>
              <div className="flex flex-col gap-1 p-3 bg-surface-container rounded-lg">
                <span className="text-xs text-on-surface-variant font-medium">This Month</span>
                <span className="text-xl font-bold text-on-surface">{thisMonth}</span>
              </div>
              <div className="flex flex-col gap-1 p-3 bg-surface-container rounded-lg col-span-2">
                <span className="text-xs text-on-surface-variant font-medium">Lifetime Value</span>
                <span className="text-xl font-bold text-on-surface">₹{payments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* QR Code Card */}
          <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">qr_code_2</span>
                <h3 className="font-h3 text-h3 text-on-surface">Member QR</h3>
              </div>
              <button
                onClick={() => setShowQR(v => !v)}
                className="text-xs text-primary font-medium hover:underline transition-colors"
              >
                {showQR ? 'Hide' : 'Show QR'}
              </button>
            </div>
            {showQR ? (
              <div className="flex flex-col items-center gap-4">
                <div ref={qrRef} className="bg-white p-4 rounded-xl border-2 border-primary/20 shadow-inner">
                  <QRCodeSVG
                    value={id}
                    size={160}
                    fgColor="#1e1b4b"
                    bgColor="#ffffff"
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-on-surface">{member.name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Scan at gym entrance to check in</p>
                </div>
                <button
                  onClick={printQR}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">print</span>
                  Print QR Card
                </button>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">Click "Show QR" to view and print this member's entry QR code.</p>
            )}
          </div>
        </div>

        {/* Right Col */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Payment History */}
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

          {/* Attendance — Calendar View */}
          <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                <h3 className="font-h3 text-h3 text-on-surface">Attendance</h3>
              </div>
              {/* Calendar / List Toggle */}
              <div className="flex gap-1 bg-surface-container rounded-lg p-0.5">
                <button
                  onClick={() => setAttendanceTab('calendar')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    attendanceTab === 'calendar' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">calendar_view_month</span>
                  Calendar
                </button>
                <button
                  onClick={() => setAttendanceTab('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    attendanceTab === 'list' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">list</span>
                  List
                </button>
              </div>
            </div>

            {attendance.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl opacity-50 mb-2">event_busy</span>
                <p>No attendance records found.</p>
              </div>
            ) : attendanceTab === 'calendar' ? (
              <AttendanceCalendar attendance={attendance} />
            ) : (
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {attendance.map(record => (
                  <div key={record.id} className="flex items-center gap-4 p-3 rounded-lg bg-surface-container border border-outline-variant/30">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-on-surface">
                        {new Date(record.timestamp || record.date).toLocaleDateString('en-IN', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </span>
                      <span className="text-sm text-on-surface-variant">
                        {new Date(record.timestamp || record.date).toLocaleTimeString('en-IN', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
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
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-on-surface-variant">Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
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
