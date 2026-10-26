import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Hotel, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isStaff = user && ['staff', 'manager', 'admin'].includes(user.role);

  const links = [
    { to: '/', label: 'Home', show: true, end: true },
    { to: '/rooms', label: 'Suites & Rooms', show: true },
    { to: '/my-bookings', label: 'My Bookings', show: !!user },
    { to: '/services', label: 'Services', show: !!user },
    { to: '/support', label: 'Support', show: !!user },
    { to: '/admin', label: 'Dashboard', show: !!isStaff },
  ].filter((l) => l.show);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `transition-colors ${isActive ? 'text-brand-500' : 'text-slate-300 hover:text-brand-500'}`;

  return (
    <header className="sticky top-0 z-50 bg-navy-950 border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div className="p-2.5 bg-brand-500 rounded-xl text-navy-950">
            <Hotel className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Hotel<span className="text-brand-500">Pro</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>{l.label}</NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 text-sm">
          <ThemeToggle />
          {user && <NotificationBell />}
          {user ? (
            <>
              <Link to="/profile" className="hidden xl:inline text-slate-300 hover:text-brand-500 transition-colors">Hi, {user.name}</Link>
              <button
                onClick={handleLogout}
                className="hidden sm:block font-semibold border border-slate-700 hover:border-brand-500 px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="font-semibold text-slate-300 hover:text-brand-500 px-2">Login</Link>
              <Link
                to="/register"
                className="font-bold bg-brand-500 hover:bg-brand-600 text-navy-950 px-4 py-2.5 rounded-xl transition-all shadow-md shadow-brand-500/20"
              >
                Sign Up
              </Link>
            </>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            className="lg:hidden p-2.5 rounded-xl border border-slate-700 text-slate-300 cursor-pointer"
          >
            {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-800 px-4 py-3 space-y-1 text-sm font-medium">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)} className={(s) => `block py-2.5 ${linkClass(s)}`}>
              {l.label}
            </NavLink>
          ))}
          {user && (
            <>
              <NavLink to="/profile" onClick={() => setOpen(false)} className={(s) => `block py-2.5 ${linkClass(s)}`}>My Profile</NavLink>
              <button onClick={handleLogout} className="block w-full text-left py-2.5 text-slate-300 hover:text-brand-500 cursor-pointer">Logout</button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
