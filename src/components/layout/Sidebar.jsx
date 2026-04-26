import { NavLink } from 'react-router-dom';
import { useDarkMode } from '../../hooks/useDarkMode';
import logoImage from '../../assets/logo.png';

export default function Sidebar() {
  const { isDarkMode, setLightMode, setDarkMode } = useDarkMode();
  const getPillClasses = (isActive) => {
    return `w-11 group-hover:w-auto h-11 flex items-center justify-center group-hover:justify-start group-hover:px-4 rounded-full transition-all duration-300 mx-1.5 ${
      isActive ? 'bg-slate-900 text-white shadow-md dark:bg-primary-container dark:text-primary' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'
    }`;
  };

  return (
    <nav className="peer hidden md:flex flex-col items-start gap-4 fixed left-4 top-4 bottom-4 w-[72px] hover:w-56 z-50 transition-all duration-300 group">
      {/* Logo */}
      <div className="w-14 group-hover:w-full h-14 bg-white dark:bg-slate-900 rounded-full group-hover:rounded-2xl flex items-center justify-center group-hover:justify-start group-hover:px-4 shadow-sm shrink-0 transition-all duration-300 overflow-hidden">
        <img src={logoImage} alt="Logo" className="w-8 h-8 object-contain shrink-0" />
        <span className="font-bold text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap max-w-0 group-hover:max-w-[200px] group-hover:ml-3 overflow-hidden">Deep Fitness</span>
      </div>
      {/* Nav Links Pill */}
      <div className="w-14 group-hover:w-full bg-white dark:bg-slate-900 rounded-full group-hover:rounded-3xl py-3 flex flex-col group-hover:items-stretch gap-2 shadow-sm shrink-0 transition-all duration-300 overflow-hidden">
        <NavLink to="/" className={({ isActive }) => getPillClasses(isActive)}>
          <span className="material-symbols-outlined text-[22px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
          <span className="font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap max-w-0 group-hover:max-w-[200px] group-hover:ml-3 overflow-hidden">Dashboard</span>
        </NavLink>
        <NavLink to="/members" className={({ isActive }) => getPillClasses(isActive)}>
          <span className="material-symbols-outlined text-[22px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
          <span className="font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap max-w-0 group-hover:max-w-[200px] group-hover:ml-3 overflow-hidden">Members</span>
        </NavLink>
        <NavLink to="/payments" className={({ isActive }) => getPillClasses(isActive)}>
          <span className="material-symbols-outlined text-[22px] shrink-0">account_balance_wallet</span>
          <span className="font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap max-w-0 group-hover:max-w-[200px] group-hover:ml-3 overflow-hidden">Payments</span>
        </NavLink>
        <NavLink to="/checkin" className={({ isActive }) => getPillClasses(isActive)}>
          <span className="material-symbols-outlined text-[22px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
          <span className="font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap max-w-0 group-hover:max-w-[200px] group-hover:ml-3 overflow-hidden">Check-in</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => getPillClasses(isActive)}>
          <span className="material-symbols-outlined text-[22px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
          <span className="font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap max-w-0 group-hover:max-w-[200px] group-hover:ml-3 overflow-hidden">Settings</span>
        </NavLink>
      </div>
      {/* Spacer */}
      <div className="flex-1"></div>
      {/* Theme Toggle Pill */}
      <div className="w-14 group-hover:w-full bg-white dark:bg-slate-900 rounded-full group-hover:rounded-2xl p-1.5 flex flex-col group-hover:flex-row items-center justify-center gap-1 shadow-sm shrink-0 transition-all duration-300">
        <button 
          onClick={setLightMode}
          className={`w-11 group-hover:flex-1 h-11 flex items-center justify-center rounded-full transition-colors ${
            !isDarkMode ? 'bg-indigo-100 text-indigo-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: !isDarkMode ? "'FILL' 1" : "'FILL' 0" }}>light_mode</span>
        </button>
        <button 
          onClick={setDarkMode}
          className={`w-11 group-hover:flex-1 h-11 flex items-center justify-center rounded-full transition-colors ${
            isDarkMode ? 'bg-indigo-100 text-indigo-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: isDarkMode ? "'FILL' 1" : "'FILL' 0" }}>dark_mode</span>
        </button>
      </div>
    </nav>
  );
}
