import { useState, useEffect } from 'react';
import { getCollection } from '../firebase/db';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({ revenue: 0, monthlyRevenue: 0, activeMembers: 0, totalMembers: 0, dailyAttendance: 0, expiringSoon: 0 });
  const [chartData, setChartData] = useState({ revenueTrend: [], memberStatus: [], revenueByPlan: [] });
  const [recentActivity, setRecentActivity] = useState([]);
  const [expiringSoonList, setExpiringSoonList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [members, payments, attendance] = await Promise.all([
          getCollection('members'),
          getCollection('payments'),
          getCollection('attendance')
        ]);

        const now = new Date();
        const totalRev = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const activeMembersCount = members.filter(m => m.status === 'Active').length;

        // Monthly revenue
        const monthlyRev = payments
          .filter(p => { const d = new Date(p.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // Today's check-ins
        const todayCheckins = attendance.filter(a => new Date(a.timestamp).toDateString() === now.toDateString()).length;

        // Expiring in next 7 days
        const in7days = new Date(); in7days.setDate(in7days.getDate() + 7);
        const expiringSoon = members.filter(m => {
          if (!m.expiryDate) return false;
          const exp = new Date(m.expiryDate);
          return exp >= now && exp <= in7days;
        });
        setExpiringSoonList(expiringSoon);

        setStats({ revenue: totalRev, monthlyRevenue: monthlyRev, activeMembers: activeMembersCount, totalMembers: members.length, dailyAttendance: todayCheckins, expiringSoon: expiringSoon.length });

        // Revenue trend by date
        const groupedPayments = {};
        payments.forEach(p => {
          const dateStr = new Date(p.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
          groupedPayments[dateStr] = (groupedPayments[dateStr] || 0) + (Number(p.amount) || 0);
        });
        const revTrend = Object.keys(groupedPayments).map(k => ({ name: k, value: groupedPayments[k] }));

        const expiredCount = members.length - activeMembersCount;
        const memberStatusData = [
          { name: 'Active', value: activeMembersCount, color: '#7c3aed' },
          { name: 'Expired', value: expiredCount > 0 ? expiredCount : 0, color: '#f59e0b' }
        ];

        const planRev = {};
        payments.forEach(p => { planRev[p.planName] = (planRev[p.planName] || 0) + (Number(p.amount) || 0); });
        const planRevData = Object.keys(planRev).map(k => ({ name: k, value: planRev[k] }));

        setChartData({
          revenueTrend: revTrend.length > 0 ? revTrend : [{ name: 'Today', value: 0 }],
          memberStatus: memberStatusData,
          revenueByPlan: planRevData
        });

        const activities = [];
        payments.forEach(p => activities.push({ type: 'payment', title: `Payment ₹${p.amount}`, date: new Date(p.date), id: p.id }));
        attendance.forEach(a => activities.push({ type: 'checkin', title: `${a.memberName} checked in`, date: new Date(a.timestamp), id: a.id }));
        activities.sort((a, b) => b.date - a.date);
        setRecentActivity(activities.slice(0, 6));
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const cardBase = "bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.1)] flex flex-col gap-4";

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="font-h1 text-h1 text-on-surface">Dashboard Overview</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Welcome back to Deep Fitness ERP. Here's what's happening today.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-stack-gap">
        <div className={cardBase}>
          <div className="flex justify-between items-start">
            <div className="p-3 bg-primary-container/30 rounded-xl">
              <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
            </div>
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-label-caps text-label-caps bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md text-xs">
              All Time
            </span>
          </div>
          <div>
            <div className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase tracking-wider">Total Revenue</div>
            <div className="font-stat-value text-stat-value text-on-surface">{loading ? '...' : `₹${stats.revenue.toLocaleString('en-IN')}`}</div>
          </div>
        </div>

        <div className={cardBase}>
          <div className="flex justify-between items-start">
            <div className="p-3 bg-secondary-container/30 rounded-xl">
              <span className="material-symbols-outlined text-secondary">show_chart</span>
            </div>
            <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-label-caps text-label-caps bg-sky-50 dark:bg-sky-900/20 px-2 py-1 rounded-md text-xs">
              This Month
            </span>
          </div>
          <div>
            <div className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase tracking-wider">Monthly Revenue</div>
            <div className="font-stat-value text-stat-value text-on-surface">{loading ? '...' : `₹${stats.monthlyRevenue.toLocaleString('en-IN')}`}</div>
          </div>
        </div>

        <div className={cardBase}>
          <div className="flex justify-between items-start">
            <div className="p-3 bg-primary-container/30 rounded-xl">
              <span className="material-symbols-outlined text-primary">group</span>
            </div>
            <span className="text-violet-600 dark:text-violet-400 font-label-caps text-label-caps bg-violet-50 dark:bg-violet-900/20 px-2 py-1 rounded-md text-xs">
              {loading ? '—' : `${stats.activeMembers}/${stats.totalMembers}`}
            </span>
          </div>
          <div>
            <div className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase tracking-wider">Active Members</div>
            <div className="font-stat-value text-stat-value text-on-surface">{loading ? '...' : stats.activeMembers}</div>
          </div>
        </div>

        <div className={cardBase}>
          <div className="flex justify-between items-start">
            <div className="p-3 bg-secondary-container/30 rounded-xl">
              <span className="material-symbols-outlined text-secondary">how_to_reg</span>
            </div>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-label-caps text-label-caps bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md text-xs">
              Today
            </span>
          </div>
          <div>
            <div className="font-label-caps text-label-caps text-on-surface-variant mb-1 uppercase tracking-wider">Daily Attendance</div>
            <div className="font-stat-value text-stat-value text-on-surface">{loading ? '...' : stats.dailyAttendance}</div>
          </div>
        </div>
      </div>

      {/* Expiring Soon Alert */}
      {!loading && expiringSoonList.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
          <div className="flex-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">{expiringSoonList.length} member{expiringSoonList.length > 1 ? 's' : ''} expiring within 7 days</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {expiringSoonList.map(m => (
                <span key={m.id} className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-700/40">
                  {m.name} — {m.expiryDate}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-gap">
        <div className="lg:col-span-2 bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.1)] flex flex-col">
          <h3 className="font-h3 text-h3 text-on-surface mb-6">Revenue Trend</h3>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.revenueTrend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.1)] flex flex-col">
          <h3 className="font-h3 text-h3 text-on-surface mb-4">Membership Status</h3>
          <div className="flex-1 flex items-center justify-center relative min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData.memberStatus} innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                  {chartData.memberStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
              <span className="font-stat-value text-stat-value text-on-surface">{stats.totalMembers}</span>
              <span className="font-label-caps text-label-caps text-on-surface-variant">Total</span>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-3">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#7c3aed]"></div><span className="text-xs text-on-surface-variant">Active</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div><span className="text-xs text-on-surface-variant">Expired</span></div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-gap">
        <div className="lg:col-span-2 bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.1)] flex flex-col">
          <h3 className="font-h3 text-h3 text-on-surface mb-6">Revenue by Plan</h3>
          {chartData.revenueByPlan.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm opacity-60 min-h-[180px]">No payment data yet.</div>
          ) : (
            <div className="flex-1 w-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.revenueByPlan}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                  <Tooltip cursor={{ fill: 'rgba(124,58,237,0.06)' }} formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                  <Bar dataKey="value" fill="#7c3aed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.1)] flex flex-col">
          <h3 className="font-h3 text-h3 text-on-surface mb-6">Recent Activity</h3>
          <div className="flex flex-col gap-5 flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-sm text-on-surface-variant">Loading activity...</div>
            ) : recentActivity.length === 0 ? (
              <div className="text-sm text-on-surface-variant">No recent activity.</div>
            ) : (
              recentActivity.map((act) => (
                <div key={act.id} className="flex gap-4 items-start">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${act.type === 'payment' ? 'bg-primary-container/40 text-primary' : 'bg-secondary-container/40 text-secondary'}`}>
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {act.type === 'payment' ? 'payments' : 'how_to_reg'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-on-surface font-medium">{act.title}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {act.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {act.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
