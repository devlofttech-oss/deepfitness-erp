import { NavLink } from 'react-router-dom';
import { useDarkMode } from '../../hooks/useDarkMode';
import logoImage from '../../assets/logo.png';

export default function Sidebar() {
  const { isDarkMode, setLightMode, setDarkMode } = useDarkMode();
  const getPillClasses = (isActive) => {
    return `w-16 group-hover:w-auto h-16 flex items-center justify-center group-hover:justify-start group-hover:px-4 rounded-full transition-all duration-300 mx-1.5 ${
      isActive ? 'bg-primary text-on-primary shadow-md dark:bg-primary-container dark:text-primary' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400'
    }`;
  };

  return (
    <nav className="peer hidden md:flex flex-col items-start gap-4 fixed left-4 top-4 bottom-4 w-[96px] hover:w-64 z-50 transition-all duration-300 group">
      {/* Logo */}
      <div className="w-20 group-hover:w-full h-20 bg-white dark:bg-slate-900 rounded-full group-hover:rounded-2xl flex items-center justify-center group-hover:justify-start group-hover:px-4 shadow-sm shrink-0 transition-all duration-300 overflow-hidden">
        <img src={logoImage} alt="Logo" className="w-12 h-12 object-contain shrink-0" />
        <span className="font-bold text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap max-w-0 group-hover:max-w-[200px] group-hover:ml-4 overflow-hidden text-lg">Deep Fitness</span>
      </div>
      {/* Nav Links Pill */}
      <div className="w-20 group-hover:w-full bg-white dark:bg-slate-900 rounded-full group-hover:rounded-3xl py-4 flex flex-col group-hover:items-stretch gap-3 shadow-sm shrink-0 transition-all duration-300 overflow-hidden">
        <NavLink to="/" className={({ isActive }) => getPillClasses(isActive)}>
          <span className="material-symbols-outlined text-[48px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
          <span className="font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap max-w-0 group-hover:max-w-[200px] group-hover:ml-4 overflow-hidden text-lg">Dashboard</span>
        </NavLink>
        <NavLink to="/members" className={({ isActive }) => getPillClasses(isActive)}>
          <span className="material-symbols-outlined text-[48px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
          <span className="font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap max-w-0 group-hover:max-w-[200px] group-hover:ml-4 overflow-hidden text-lg">Members</span>
        </NavLink>
        <NavLink to="/payments" className={({ isActive }) => getPillClasses(isActive)}>
          <span className="material-symbols-outlined text-[48px] shrink-0">account_balance_wallet</span>
          <span className="font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap max-w-0 group-hover:max-w-[200px] group-hover:ml-4 overflow-hidden text-lg">Payments</span>
        </NavLink>
        <NavLink to="/checkin" className={({ isActive }) => getPillClasses(isActive)}>
          <span className="material-symbols-outlined text-[48px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
          <span className="font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap max-w-0 group-hover:max-w-[200px] group-hover:ml-4 overflow-hidden text-lg">Check-in</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => getPillClasses(isActive)}>
          <span className="material-symbols-outlined text-[48px] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
          <span className="font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap max-w-0 group-hover:max-w-[200px] group-hover:ml-4 overflow-hidden text-lg">Settings</span>
        </NavLink>
      </div>
      {/* Spacer */}
      <div className="flex-1"></div>
      {/* Theme Toggle Pill */}
      <div className="w-20 group-hover:w-full bg-white dark:bg-slate-900 rounded-full group-hover:rounded-2xl p-2 flex flex-col group-hover:flex-row items-center justify-center gap-2 shadow-sm shrink-0 transition-all duration-300">
        <button 
          onClick={setLightMode}
          className={`w-16 group-hover:flex-1 h-16 flex items-center justify-center rounded-full transition-colors ${
            !isDarkMode ? 'bg-indigo-100 text-indigo-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: !isDarkMode ? "'FILL' 1" : "'FILL' 0" }}>light_mode</span>
        </button>
        <button 
          onClick={setDarkMode}
          className={`w-16 group-hover:flex-1 h-16 flex items-center justify-center rounded-full transition-colors ${
            isDarkMode ? 'bg-indigo-100 text-indigo-500' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[48px]" style={{ fontVariationSettings: isDarkMode ? "'FILL' 1" : "'FILL' 0" }}>dark_mode</span>
        </button>
      </div>
    </nav>
  );
}
