import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/admin/ui';

const ALL = ['staff', 'manager', 'admin'];
const MANAGERS = ['manager', 'admin'];

// Every tab is loaded only when opened (the charts library, for example, is only fetched for Reports)
const TABS = [
  { id: 'bookings', label: 'Bookings', roles: ALL, Component: lazy(() => import('../components/admin/BookingsTab')) },
  { id: 'rooms', label: 'Rooms', roles: ALL, Component: lazy(() => import('../components/admin/RoomsTab')) },
  { id: 'housekeeping', label: 'Housekeeping', roles: ALL, Component: lazy(() => import('../components/admin/HousekeepingTab')) },
  { id: 'services', label: 'Service requests', roles: ALL, Component: lazy(() => import('../components/admin/ServicesTab')) },
  { id: 'support', label: 'Support', roles: ALL, Component: lazy(() => import('../components/admin/SupportTab')) },
  { id: 'reports', label: 'Reports', roles: MANAGERS, Component: lazy(() => import('../components/admin/ReportsTab')) },
  { id: 'payments', label: 'Payments', roles: MANAGERS, Component: lazy(() => import('../components/admin/PaymentsTab')) },
  { id: 'pricing', label: 'Pricing', roles: MANAGERS, Component: lazy(() => import('../components/admin/PricingTab')) },
  { id: 'users', label: 'Users & staff', roles: ['admin'], Component: lazy(() => import('../components/admin/UsersTab')) },
  { id: 'security', label: 'Security & logs', roles: ['admin'], Component: lazy(() => import('../components/admin/SecurityTab')) },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const visible = TABS.filter((t) => t.roles.includes(user.role));
  const active = visible.find((t) => t.id === params.get('tab')) || visible[0];
  const Active = active.Component;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-black">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1 capitalize">Signed in as {user.role}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {visible.map((t) => (
          <button
            key={t.id}
            onClick={() => setParams({ tab: t.id })}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              active.id === t.id ? 'bg-navy-950 text-white' : 'bg-white border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Suspense fallback={<Spinner />}>
        <Active key={active.id} />
      </Suspense>
    </div>
  );
}
