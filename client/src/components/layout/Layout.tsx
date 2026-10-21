import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-900 relative overflow-hidden">
      {/* Ambient background radial glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[400px] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 -left-40 w-[500px] h-[400px] bg-brand-500/5 rounded-full blur-[130px]" />
      </div>

      <Header />
      <main className="flex-1 relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
