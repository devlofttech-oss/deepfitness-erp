import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <div className="bg-background text-on-background antialiased flex h-screen overflow-hidden">
      <Sidebar onExpandChange={setSidebarExpanded} />
      <div
        className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-300 ${
          sidebarExpanded ? 'md:ml-[240px]' : 'md:ml-[88px]'
        }`}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto p-gutter lg:p-container-margin space-y-section-gap custom-scrollbar pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
