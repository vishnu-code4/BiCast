import { type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Bike, Map, Clock, ChevronRight, Bookmark } from 'lucide-react';
import ApiStatusBadge from '@/components/ui/ApiStatusBadge';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-surface-900/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="BiCAST home">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center
                              shadow-glow-orange group-hover:scale-105 transition-transform duration-200">
                <Bike size={20} className="text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400
                              border-2 border-surface-900 animate-pulse-slow" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-lg tracking-tight text-white">BiCAST</span>
              <span className="text-[10px] text-white/40 font-medium tracking-widest uppercase">
                Weather Intelligence
              </span>
            </div>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            <NavItem to="/" icon={<ChevronRight size={14} />} label="Home" end />
            <NavItem to="/plan" icon={<Map size={14} />} label="Plan a Ride" />
            <NavItem to="/saved-trips" icon={<Bookmark size={14} />} label="Saved Trips" />
            <NavItem to="/history" icon={<Clock size={14} />} label="History" />
          </nav>

          {/* API status */}
          <div className="flex items-center gap-3">
            <ApiStatusBadge />
            <Link
              to="/plan"
              id="header-plan-ride-cta"
              className="btn-primary text-sm hidden sm:flex items-center gap-2"
            >
              Plan a Ride
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavItem({
  to,
  icon,
  label,
  end,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200
        ${isActive
          ? 'bg-brand-500/15 text-brand-400'
          : 'text-white/60 hover:text-white hover:bg-white/5'
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
