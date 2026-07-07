import { useState, useEffect, useRef } from 'react';
import { getCollection } from '../../firebase/db';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

const monthLabel = (ym) => {
  const [y, m] = ym.split('-');
  return new Date(y, m - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
};

const prevMonthYM = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  if (m === 1) return `${y - 1}-12`;
  return `${y}-${String(m - 1).padStart(2, '0')}`;
};

const inRange = (dateStr, start, end) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
};

export default function MonthlyReport() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => { fetchStats(); }, [selectedMonth]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [y, m] = selectedMonth.split('-').map(Number);
      const startDate    = new Date(y, m - 1, 1);
      const endDate      = new Date(y, m, 0, 23, 59, 59);

      const prevYM       = prevMonthYM(selectedMonth);
      const [py, pm]     = prevYM.split('-').map(Number);
      const prevStart    = new Date(py, pm - 1, 1);
      const prevEnd      = new Date(py, pm, 0, 23, 59, 59);

      const [members, payments] = await Promise.all([
        getCollection('members'),
        getCollection('payments'),
      ]);

      // Current month
      const newAdmissions      = members.filter(mem => inRange(mem.joinDate, startDate, endDate));
      const currentPayments    = payments.filter(p  => inRange(p.date, startDate, endDate));
      const newAdmissionIds    = new Set(newAdmissions.map(mem => mem.id));
      const renewals           = currentPayments.filter(p => !newAdmissionIds.has(p.memberId));
      const totalCollected     = currentPayments.reduce((s, p) => s + Number(p.paidAmount || p.amount || 0), 0);

      // Previous month
      const prevNewAdmissions  = members.filter(mem => inRange(mem.joinDate, prevStart, prevEnd));
      const prevPayments       = payments.filter(p  => inRange(p.date, prevStart, prevEnd));
      const prevNewIds         = new Set(prevNewAdmissions.map(mem => mem.id));
      const prevRenewals       = prevPayments.filter(p => !prevNewIds.has(p.memberId));
      const prevCollected      = prevPayments.reduce((s, p) => s + Number(p.paidAmount || p.amount || 0), 0);

      // Last 6 months chart data
      const chartData = [];
      for (let i = 5; i >= 0; i--) {
        const d      = new Date(y, m - 1 - i, 1);
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const mPmts  = payments.filter(p => inRange(p.date, mStart, mEnd));
        chartData.push({
          month:   d.toLocaleString('en-IN', { month: 'short' }),
          revenue: mPmts.reduce((s, p) => s + Number(p.paidAmount || p.amount || 0), 0),
        });
      }

      setStats({
        newAdmissions: newAdmissions.length,
        renewals: renewals.length,
        totalAdmissions: newAdmissions.length + renewals.length,
        totalCollected,
        prevNewAdmissions: prevNewAdmissions.length,
        prevRenewals: prevRenewals.length,
        prevAdmissionCount: prevNewAdmissions.length + prevRenewals.length,
        prevCollected,
        chartData,
        currentPayments,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas  = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pw      = pdf.internal.pageSize.getWidth();
      const ph      = (canvas.height * pw) / canvas.width;
      // If report is taller than one page, add pages
      const pageH = pdf.internal.pageSize.getHeight();
      if (ph <= pageH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pw, ph);
      } else {
        let y = 0;
        while (y < ph) {
          if (y > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -y, pw, ph);
          y += pageH;
        }
      }
      pdf.save(`Monthly_Report_${selectedMonth}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = () => {
    if (!stats) return;
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summary = [
      ['Monthly Business Report', monthLabel(selectedMonth)],
      [],
      ['Metric', 'Current Month', 'Previous Month', 'Change'],
      ['New Admissions', stats.newAdmissions, stats.prevNewAdmissions, stats.newAdmissions - stats.prevNewAdmissions],
      ['Renewals', stats.renewals, stats.prevRenewals, stats.renewals - stats.prevRenewals],
      ['Total Admissions', stats.totalAdmissions, stats.prevAdmissionCount, stats.totalAdmissions - stats.prevAdmissionCount],
      ['Total Collected (₹)', stats.totalCollected, stats.prevCollected, stats.totalCollected - stats.prevCollected],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Summary');

    // Payments detail sheet
    const rows = [['Member Name', 'Plan', 'Amount (₹)', 'Payment Mode', 'Date']];
    stats.currentPayments.forEach(p => rows.push([
      p.memberName || '',
      p.planName   || '',
      Number(p.paidAmount || p.amount || 0),
      p.paymentMode || '',
      p.date ? new Date(p.date).toLocaleDateString('en-IN') : '',
    ]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Payments Detail');

    XLSX.writeFile(wb, `Monthly_Report_${selectedMonth}.xlsx`);
  };

  const incomeChange     = stats ? stats.totalCollected - stats.prevCollected : 0;
  const incomePct        = stats && stats.prevCollected
    ? ((incomeChange / stats.prevCollected) * 100).toFixed(1)
    : null;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-h1 text-h1 text-on-surface">Monthly Business Report</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Admissions, revenue, and month-on-month comparison</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-xl text-on-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
          <button
            onClick={handleExportPDF}
            disabled={loading || !stats || exporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            {exporting ? 'Exporting...' : 'PDF'}
          </button>
          <button
            onClick={handleExportExcel}
            disabled={loading || !stats}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">table_view</span>
            Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-on-surface-variant gap-3">
          <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
          Loading report…
        </div>
      ) : stats ? (
        <div ref={reportRef} className="flex flex-col gap-6">
          {/* Month title */}
          <div className="text-center">
            <h2 className="font-h2 text-h2 text-on-surface">{monthLabel(selectedMonth)}</h2>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="New Admissions" value={stats.newAdmissions}    prev={stats.prevNewAdmissions}   icon="person_add"  color="blue"   />
            <StatCard title="Renewals"        value={stats.renewals}         prev={stats.prevRenewals}        icon="autorenew"   color="purple" />
            <StatCard title="Total Members"   value={stats.totalAdmissions}  prev={stats.prevAdmissionCount}  icon="groups"      color="indigo" />
            <StatCard
              title="Total Collected"
              value={`₹${stats.totalCollected.toLocaleString('en-IN')}`}
              rawValue={stats.totalCollected}
              prev={stats.prevCollected}
              icon="payments"
              color="green"
              isCurrency
            />
          </div>

          {/* Comparison + Income Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-sm">
              <h3 className="font-h3 text-h3 text-on-surface mb-1">vs Previous Month</h3>
              <p className="text-xs text-on-surface-variant mb-4">{monthLabel(prevMonthYM(selectedMonth))}</p>
              <div className="flex flex-col gap-1">
                <CompareRow label="New Admissions" curr={stats.newAdmissions}   prev={stats.prevNewAdmissions}  />
                <CompareRow label="Renewals"        curr={stats.renewals}        prev={stats.prevRenewals}       />
                <CompareRow label="Total Admissions" curr={stats.totalAdmissions} prev={stats.prevAdmissionCount} />
                <CompareRow label="Revenue"         curr={stats.totalCollected}  prev={stats.prevCollected}      isCurrency />
              </div>
            </div>

            <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-sm">
              <h3 className="font-h3 text-h3 text-on-surface mb-1">Income Summary</h3>
              {incomePct !== null && (
                <p className="text-xs text-on-surface-variant mb-4">
                  {incomeChange >= 0 ? '▲' : '▼'} {Math.abs(incomePct)}% compared to last month
                </p>
              )}
              <div className="flex flex-col gap-0">
                <div className="flex justify-between items-center py-3 border-b border-outline-variant/20">
                  <span className="text-sm text-on-surface-variant">Current Month</span>
                  <span className="font-bold text-lg text-on-surface">₹{stats.totalCollected.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-outline-variant/20">
                  <span className="text-sm text-on-surface-variant">Previous Month</span>
                  <span className="font-semibold text-on-surface-variant">₹{stats.prevCollected.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-on-surface-variant">Difference</span>
                  <span className={`font-bold text-lg ${incomeChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {incomeChange >= 0 ? '+' : ''}₹{Math.abs(incomeChange).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Trend Chart */}
          <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-sm">
            <h3 className="font-h3 text-h3 text-on-surface mb-6">Revenue Trend – Last 6 Months</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
                />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Payments Table */}
          <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-sm overflow-x-auto">
            <h3 className="font-h3 text-h3 text-on-surface mb-4">
              Payments This Month ({stats.currentPayments.length})
            </h3>
            {stats.currentPayments.length === 0 ? (
              <p className="text-on-surface-variant text-center py-8">No payments recorded this month.</p>
            ) : (
              <table className="w-full text-sm min-w-[500px]">
                <thead>
                  <tr className="border-b border-outline-variant/30">
                    <th className="text-left py-3 pr-4 font-semibold text-on-surface-variant">Member</th>
                    <th className="text-left py-3 pr-4 font-semibold text-on-surface-variant">Plan</th>
                    <th className="text-right py-3 pr-4 font-semibold text-on-surface-variant">Amount</th>
                    <th className="text-left py-3 pr-4 font-semibold text-on-surface-variant">Mode</th>
                    <th className="text-left py-3 font-semibold text-on-surface-variant">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.currentPayments.map((p, i) => (
                    <tr key={i} className="border-b border-outline-variant/10 hover:bg-surface-container/50 transition-colors">
                      <td className="py-3 pr-4 font-medium text-on-surface">{p.memberName}</td>
                      <td className="py-3 pr-4 text-on-surface-variant">{p.planName}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-on-surface">
                        ₹{Number(p.paidAmount || p.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 pr-4 text-on-surface-variant">{p.paymentMode}</td>
                      <td className="py-3 text-on-surface-variant">
                        {p.date ? new Date(p.date).toLocaleDateString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-surface-container/40">
                    <td colSpan={2} className="py-3 pr-4 font-bold text-on-surface">Total</td>
                    <td className="py-3 pr-4 text-right font-bold text-on-surface">
                      ₹{stats.totalCollected.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ title, value, prev, rawValue, icon, color, isCurrency }) {
  const curr = isCurrency ? (rawValue ?? 0) : (typeof value === 'number' ? value : 0);
  const diff = curr - (prev || 0);
  const up   = diff >= 0;

  const palette = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',     icon: 'text-blue-600',    border: 'border-blue-100 dark:border-blue-800'   },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'text-purple-600',  border: 'border-purple-100 dark:border-purple-800'},
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', icon: 'text-indigo-600',  border: 'border-indigo-100 dark:border-indigo-800'},
    green:  { bg: 'bg-emerald-50 dark:bg-emerald-900/20',icon: 'text-emerald-600',border: 'border-emerald-100 dark:border-emerald-800'},
  };
  const c = palette[color] || palette.blue;

  return (
    <div className={`bg-surface-container-lowest p-5 rounded-2xl shadow-sm border ${c.border} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-on-surface-variant leading-tight">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg} shrink-0`}>
          <span className={`material-symbols-outlined text-[20px] ${c.icon}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
        </div>
      </div>
      <div className="font-bold text-2xl text-on-surface">{value}</div>
      <div className={`text-xs font-medium flex items-center gap-1 ${up ? 'text-emerald-600' : 'text-red-500'}`}>
        <span className="material-symbols-outlined text-[14px]">{up ? 'trending_up' : 'trending_down'}</span>
        {up ? '+' : ''}{isCurrency ? `₹${Math.abs(diff).toLocaleString('en-IN')}` : diff} vs last month
      </div>
    </div>
  );
}

function CompareRow({ label, curr, prev, isCurrency }) {
  const diff = curr - prev;
  const up   = diff >= 0;
  const fmt  = (v) => isCurrency ? `₹${Number(v).toLocaleString('en-IN')}` : v;

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-outline-variant/10 last:border-0">
      <span className="text-sm text-on-surface-variant">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-on-surface-variant">{fmt(prev)}</span>
        <span className="material-symbols-outlined text-[14px] text-on-surface-variant/40">arrow_forward</span>
        <span className="font-semibold text-sm text-on-surface">{fmt(curr)}</span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${up ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
          {up ? '+' : ''}{isCurrency ? `₹${Math.abs(diff).toLocaleString('en-IN')}` : diff}
        </span>
      </div>
    </div>
  );
}
