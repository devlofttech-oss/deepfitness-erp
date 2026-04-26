import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  return (
    <div className="bg-background text-on-background antialiased flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-[104px] md:peer-hover:ml-[256px] transition-[margin] duration-300 overflow-hidden relative">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-gutter lg:p-container-margin space-y-section-gap custom-scrollbar pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
