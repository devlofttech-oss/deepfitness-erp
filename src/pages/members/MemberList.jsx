import { useState, useEffect, useRef } from 'react';
import { getCollection, createDocument } from '../../firebase/db';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

function daysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

function buildWhatsAppLink(phone, name, expiryDate) {
  const cleaned = String(phone).replace(/\D/g, '');
  const withCountry = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;
  const message = encodeURIComponent(
    `Hi ${name}! 👋\n\nYour *Deep Fitness* membership expires on *${expiryDate}*.\n\nRenew now to keep your fitness journey going! 💪\n\nReply to this message or visit us to renew.\n\n— Deep Fitness Team`
  );
  return `https://wa.me/${withCountry}?text=${message}`;
}

export default function MemberList() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null); // { rows, headers }
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await getCollection('members');
      setMembers(data);
    } catch (error) {
      console.error('Failed to fetch members', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Excel Import ──────────────────────────────────────────────────────────

  // Converts Excel serial numbers and common string formats → YYYY-MM-DD
  function parseDate(val) {
    if (val === null || val === undefined || val === '') return '';
    if (typeof val === 'number') {
      // Excel date serial (days since 1900-01-01, with leap-year bug offset)
      const d = new Date(Math.round((val - 25569) * 864e5));
      return d.toISOString().split('T')[0];
    }
    const s = String(val).trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // already YYYY-MM-DD
    // DD-MM-YYYY or DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    // MM-DD-YYYY fallback via native Date
    const parsed = new Date(s);
    if (!isNaN(parsed)) return parsed.toISOString().split('T')[0];
    return s;
  }

  // Case-insensitive column lookup — tries each key variant
  function col(row, ...keys) {
    for (const k of keys) {
      for (const attempt of [k, k.toLowerCase(), k.toUpperCase()]) {
        if (row[attempt] !== undefined && row[attempt] !== '') return row[attempt];
      }
    }
    return '';
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (rows.length === 0) { toast.error('No data found in the file.'); return; }
        setImportPreview({ rows, fileName: file.name });
      } catch (err) {
        toast.error('Failed to read Excel file. Please use .xlsx or .xls format.');
        console.error(err);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!importPreview) return;
    setImporting(true);
    let success = 0, failed = 0;
    try {
      for (const row of importPreview.rows) {
        try {
          const name       = col(row, 'NAME', 'Name', 'Member Name', 'name');
          const phone      = String(col(row, 'MOBILE NUMBER', 'Mobile Number', 'Phone', 'Mobile', 'phone') || '');
          const admDate    = parseDate(col(row, 'ADMISSION DATE', 'Admission Date', 'Join Date', 'joinDate', 'Active From', 'Start Date'));
          const dueDate    = parseDate(col(row, 'DUE DATE', 'Due Date', 'Expiry Date', 'Expiry', 'expiryDate'));
          const membership = col(row, 'MEMBERSHIP', 'Membership', 'Plan', 'Plan Name', 'planName');
          const totalFees  = Number(col(row, 'Total fees', 'Total Fees', 'TOTAL FEES', 'totalFees'))  || 0;
          const paidFees   = Number(col(row, 'Fees paid', 'Fees Paid', 'FEES PAID', 'paidFees'))      || 0;
          const balFees    = Number(col(row, 'Balance fees', 'Balance Fees', 'BALANCE FEES', 'balanceFees')) || 0;
          const payMode    = col(row, 'Payment mode', 'Payment Mode', 'PAYMENT MODE', 'paymentMode') || 'Cash';
          const statusRaw  = col(row, 'STATUS', 'Status', 'status');
          const email      = col(row, 'Email', 'EMAIL', 'email');

          if (!name) { failed++; continue; }

          // Prefix with "Gym - " since these are gym-category members
          const planName = membership ? `Gym - ${String(membership).trim()}` : '';

          // Derive status from due date if not explicitly set
          const effectiveStatus = dueDate && new Date(dueDate) < new Date()
            ? 'Expired'
            : (statusRaw ? String(statusRaw).trim() : 'Active');

          await createDocument('members', {
            name: String(name).trim(),
            phone: String(phone).trim(),
            email: String(email).trim(),
            planName,
            joinDate: admDate,
            planActiveFrom: admDate,
            expiryDate: dueDate,
            totalFees,
            paidFees,
            balanceFees: balFees,
            paymentMode: String(payMode).trim(),
            status: effectiveStatus,
            importedAt: new Date().toISOString(),
          });
          success++;
        } catch {
          failed++;
        }
      }
      toast.success(`Imported ${success} member${success !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} skipped)` : ''}!`);
      setImportPreview(null);
      fetchMembers();
    } catch (err) {
      toast.error('Import failed. Please try again.');
      console.error(err);
    } finally {
      setImporting(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const getStatusBadge = (status) => {
    if (status === 'Active') {
      return (
        <span className="flex items-center gap-1 text-emerald-600 font-label-caps text-label-caps bg-emerald-50 px-2 py-1 rounded-md w-fit">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Active
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-rose-600 font-label-caps text-label-caps bg-rose-50 px-2 py-1 rounded-md w-fit">
        <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div> Expired
      </span>
    );
  };

  const CATEGORIES = ['All', 'Gym', 'Zumba', 'Kids Dance'];
  const CATEGORY_META = {
    Gym:          { icon: 'fitness_center', color: 'text-violet-600',  bg: 'bg-violet-50',  activeBg: 'bg-violet-600' },
    Zumba:        { icon: 'music_note',     color: 'text-pink-600',    bg: 'bg-pink-50',    activeBg: 'bg-pink-500' },
    'Kids Dance': { icon: 'child_care',     color: 'text-amber-600',   bg: 'bg-amber-50',   activeBg: 'bg-amber-500' },
  };

  const filtered = members.filter(m => {
    const term = searchTerm.toLowerCase();
    const matchSearch = !term || m.name?.toLowerCase().includes(term) || m.phone?.includes(term);
    const days = daysUntilExpiry(m.expiryDate);
    const effectiveStatus = days !== null && days < 0 ? 'Expired' : 'Active';
    const matchStatus = filterStatus === 'All' || effectiveStatus === filterStatus;
    const matchCategory = filterCategory === 'All' || m.planName?.startsWith(filterCategory);
    return matchSearch && matchStatus && matchCategory;
  });

  const expiringCount = members.filter(m => {
    const days = daysUntilExpiry(m.expiryDate);
    return days !== null && days >= 0 && days <= 7;
  }).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-h1 text-h1 text-on-surface">Members</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Manage your gym members, plans, and statuses.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Import Excel */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium border border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container text-on-surface transition-colors shadow-sm text-sm"
            title="Import members from Excel (.xlsx / .xls)"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-600">upload_file</span>
            Import Excel
          </button>

          <Link
            to="/members/add"
            className="bg-primary text-on-primary px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            New Member
          </Link>
        </div>
      </div>

      {/* Expiring Soon Alert */}
      {expiringCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-amber-500 text-2xl">notification_important</span>
          <p className="text-sm font-medium text-amber-800">
            <strong>{expiringCount} member{expiringCount > 1 ? 's' : ''}</strong> expiring within 7 days — send a WhatsApp reminder using the{' '}
            <span className="inline-flex items-center gap-0.5 text-green-700">
              <span className="material-symbols-outlined text-[14px]">chat</span> WhatsApp
            </span>{' '}
            button in their row.
          </p>
        </div>
      )}

      {/* ── Import Preview Modal ── */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
              <div>
                <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500">upload_file</span>
                  Import Preview
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">{importPreview.fileName} — {importPreview.rows.length} records found</p>
              </div>
              <button onClick={() => setImportPreview(null)} className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              <p className="text-sm text-on-surface-variant mb-3">
                The following members will be added. Existing members will not be duplicated automatically — please verify before confirming.
              </p>
              <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-low/60">
                    <tr>
                      {['Name', 'Mobile', 'Membership', 'Admission', 'Due Date', 'Total', 'Paid', 'Balance', 'Status'].map(h => (
                        <th key={h} className="p-3 font-semibold text-on-surface-variant text-xs uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.rows.slice(0, 10).map((row, i) => {
                      const name       = col(row, 'NAME', 'Name', 'Member Name') || '';
                      const phone      = col(row, 'MOBILE NUMBER', 'Mobile Number', 'Phone', 'Mobile') || '';
                      const membership = col(row, 'MEMBERSHIP', 'Membership', 'Plan', 'Plan Name') || '';
                      const admDate    = parseDate(col(row, 'ADMISSION DATE', 'Admission Date', 'Join Date'));
                      const dueDate    = parseDate(col(row, 'DUE DATE', 'Due Date', 'Expiry Date', 'Expiry'));
                      const totalF     = col(row, 'Total fees', 'Total Fees', 'TOTAL FEES') || '—';
                      const paidF      = col(row, 'Fees paid', 'Fees Paid', 'FEES PAID') || '—';
                      const balF       = col(row, 'Balance fees', 'Balance Fees', 'BALANCE FEES') || '—';
                      const status     = col(row, 'STATUS', 'Status') || '';
                      return (
                        <tr key={i} className="border-t border-outline-variant/10 hover:bg-surface-container/30">
                          <td className="p-3 font-medium text-on-surface">{name || <em className="text-rose-400">Missing</em>}</td>
                          <td className="p-3 text-on-surface-variant">{String(phone)}</td>
                          <td className="p-3 text-on-surface-variant">{String(membership)}</td>
                          <td className="p-3 text-on-surface-variant">{admDate}</td>
                          <td className="p-3 text-on-surface-variant">{dueDate}</td>
                          <td className="p-3 text-on-surface-variant">{String(totalF)}</td>
                          <td className="p-3 text-on-surface-variant">{String(paidF)}</td>
                          <td className="p-3 text-on-surface-variant">{String(balF)}</td>
                          <td className="p-3 text-on-surface-variant">{String(status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {importPreview.rows.length > 10 && (
                <p className="text-xs text-on-surface-variant mt-2 text-center">
                  Showing 10 of {importPreview.rows.length} records.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-outline-variant/20">
              <button
                onClick={() => setImportPreview(null)}
                className="px-4 py-2 rounded-lg font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={importing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70"
              >
                {importing ? (
                  <><span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span> Importing...</>
                ) : (
                  <><span className="material-symbols-outlined text-[16px]">upload</span> Import {importPreview.rows.length} Members</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => {
          const meta = CATEGORY_META[cat];
          const isActive = filterCategory === cat;
          const count = cat === 'All'
            ? members.length
            : members.filter(m => m.planName?.startsWith(cat)).length;
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                isActive
                  ? cat === 'All'
                    ? 'bg-primary text-on-primary border-primary shadow-sm'
                    : `${meta.activeBg} text-white border-transparent shadow-sm`
                  : `bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant hover:bg-surface-container`
              }`}
            >
              {meta && (
                <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-white' : meta.color}`}>
                  {meta.icon}
                </span>
              )}
              {cat}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                isActive ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Status Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 flex-1 min-w-[220px] max-w-xs shadow-sm">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-on-surface outline-none text-sm placeholder:text-on-surface-variant"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {['All', 'Active', 'Expired'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* List Card */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Member</th>
                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Phone</th>
                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Plan</th>
                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Expiry Date</th>
                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase">Status</th>
                <th className="p-4 font-label-caps text-label-caps text-on-surface-variant uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin text-2xl mr-2">progress_activity</span>
                    Loading members...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-5xl opacity-40">group_off</span>
                      <p className="font-medium">No members found</p>
                      <Link to="/members/add" className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                        Add First Member
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(member => {
                  const days = daysUntilExpiry(member.expiryDate);
                  const isExpiringSoon = days !== null && days >= 0 && days <= 7;
                  const isExpired = days !== null && days < 0;
                  const effectiveStatus = isExpired ? 'Expired' : 'Active';

                  return (
                    <tr key={member.id} className="border-b border-outline-variant/20 hover:bg-surface-container/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold flex-shrink-0">
                            {member.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-on-surface">{member.name}</div>
                            {member.email && (
                              <div className="text-xs text-on-surface-variant">{member.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-on-surface-variant">{member.phone}</td>
                      <td className="p-4 text-sm text-on-surface-variant">{member.planName || 'N/A'}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-sm font-medium ${isExpired ? 'text-rose-600' : isExpiringSoon ? 'text-amber-600' : 'text-on-surface'}`}>
                            {member.expiryDate || 'N/A'}
                          </span>
                          {isExpiringSoon && (
                            <span className="text-xs text-amber-500 font-medium">
                              ⚠ Expires in {days} day{days !== 1 ? 's' : ''}
                            </span>
                          )}
                          {isExpired && (
                            <span className="text-xs text-rose-500 font-medium">
                              Expired {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} ago
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{getStatusBadge(effectiveStatus)}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {isExpiringSoon && member.phone && (
                            <a
                              href={buildWhatsAppLink(member.phone, member.name, member.expiryDate)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Send WhatsApp renewal reminder to ${member.name}`}
                              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm animate-pulse hover:animate-none"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.737 5.469 2.026 7.769L0 32l8.476-2.003A15.944 15.944 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.279 13.279 0 01-6.77-1.848l-.484-.289-5.03 1.188 1.22-4.898-.317-.503A13.302 13.302 0 012.667 16C2.667 8.637 8.637 2.667 16 2.667S29.333 8.637 29.333 16 23.363 29.333 16 29.333zm7.306-9.984c-.4-.2-2.368-1.168-2.735-1.302-.368-.133-.636-.2-.904.2-.267.4-1.036 1.302-1.27 1.569-.234.267-.468.3-.868.1-.4-.2-1.688-.622-3.215-1.984-1.188-1.06-1.99-2.369-2.224-2.769-.234-.4-.025-.616.175-.815.181-.18.4-.468.601-.702.2-.233.267-.4.4-.667.134-.267.067-.5-.033-.7-.1-.2-.904-2.18-1.237-2.985-.326-.785-.657-.678-.904-.69l-.768-.013c-.267 0-.7.1-1.068.5-.367.4-1.403 1.37-1.403 3.344s1.437 3.878 1.637 4.145c.2.267 2.827 4.315 6.851 6.051.957.413 1.704.66 2.286.845.96.306 1.835.263 2.525.16.77-.115 2.368-.969 2.702-1.904.334-.936.334-1.737.234-1.904-.1-.167-.367-.267-.767-.467z"/>
                              </svg>
                              Remind
                            </a>
                          )}
                          <Link
                            to={`/members/${member.id}`}
                            className="bg-primary/10 text-primary dark:bg-indigo-500/20 dark:text-indigo-300 hover:bg-primary/20 dark:hover:bg-indigo-500/30 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors"
                          >
                            View Profile
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

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-outline-variant/20 text-xs text-on-surface-variant">
            Showing {filtered.length} of {members.length} members
          </div>
        )}
      </div>
    </div>
  );
}
