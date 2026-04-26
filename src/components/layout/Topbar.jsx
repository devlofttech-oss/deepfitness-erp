import { useState, useRef, useEffect } from 'react';
import NotificationPanel from '../ui/NotificationPanel';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md text-purple-900 dark:text-purple-400 font-['Plus_Jakarta_Sans'] text-sm sticky top-4 z-40 mx-4 md:mx-gutter lg:mx-container-margin md:ml-0 mt-4 mb-4 border border-slate-200/50 dark:border-slate-800/50 shadow-sm rounded-full flex justify-between items-center h-16 px-6">
      <div className="flex items-center gap-6">
        <div className="hidden text-lg font-bold tracking-tight text-slate-900 dark:text-white">Deep Fitness ERP</div>
        <div className="relative w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input className="w-full pl-10 pr-4 py-2 bg-slate-100/50 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400" placeholder="Search..." type="text" />
        </div>
      </div>
      <div className="flex items-center gap-4 relative">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`p-2 transition-colors rounded-full ${isNotifOpen ? 'bg-primary-container text-primary' : 'text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
        
        <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
        
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
        <div className="relative" ref={profileRef}>
          <img 
            alt="User Profile" 
            className="w-9 h-9 rounded-full ml-2 object-cover border border-slate-200 dark:border-slate-700 cursor-pointer"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBM37p5gvWcpTkz9fs-4c37faTyBgoBQ3Q2BnS9a_Gx0Vsldj7J8tqQ0miI4Diuz4WBES9MpqPRy9s76Z9OMgOILd9-8iFQrOrNs-cwUjXaxY4qx5SDaaPpnS5mAj-GO1pSaz6_5DwjKOdNrEbVaRVg0g2qzxehhGroqF_8azhvFke0KKPcHryybRLKAL5XDwlbQnc1LAG_SiAl3qc2kOsX8TIK_J7XVIbfN50qWYjy4Ejyiug7s5Ea8LPNR34nmMVHg1f0cSy_-90r"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
          />
          {isProfileOpen && (
            <div className="absolute top-12 right-0 w-48 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-lg z-50 py-1 overflow-hidden animate-fade-in">
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-error-container/20 flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
