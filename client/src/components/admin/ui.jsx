import { Loader2 } from 'lucide-react';

export const inputCls = 'border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-500';
export const btnCls = 'text-xs font-semibold border border-slate-200 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg cursor-pointer disabled:opacity-50';
export const primaryBtn = 'bg-navy-950 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors disabled:opacity-60';
export const dangerBtn = 'text-xs font-semibold text-red-600 hover:underline cursor-pointer';

export const Spinner = () => (
  <div className="flex justify-center py-16">
    <Loader2 className="w-7 h-7 animate-spin text-brand-600" />
  </div>
);

export const ErrorNote = ({ message }) =>
  message ? <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{message}</p> : null;

export const Table = ({ heads, children, empty, colSpan }) => (
  <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="text-left text-xs uppercase text-slate-500 bg-slate-50">
        <tr>{heads.map((h) => <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>)}</tr>
      </thead>
      <tbody>
        {children}
        {empty && (
          <tr><td colSpan={colSpan || heads.length} className="px-4 py-10 text-center text-slate-500">{empty}</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

export const StatCard = ({ title, value, hint }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5">
    <p className="text-xs font-bold text-slate-500 uppercase">{title}</p>
    <p className="text-2xl font-black mt-1">{value}</p>
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800', open: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800', completed: 'bg-emerald-100 text-emerald-800', done: 'bg-emerald-100 text-emerald-800', succeeded: 'bg-emerald-100 text-emerald-800', paid: 'bg-emerald-100 text-emerald-800', available: 'bg-emerald-100 text-emerald-800',
  checked_in: 'bg-sky-100 text-sky-800', in_progress: 'bg-sky-100 text-sky-800', occupied: 'bg-sky-100 text-sky-800',
  checked_out: 'bg-slate-100 text-slate-700', cancelled: 'bg-slate-100 text-slate-700', closed: 'bg-slate-100 text-slate-700', cleaning: 'bg-violet-100 text-violet-800',
  active: 'bg-emerald-100 text-emerald-800', paused: 'bg-slate-100 text-slate-700', deactivated: 'bg-red-100 text-red-700',
  refunded: 'bg-red-100 text-red-700', failed: 'bg-red-100 text-red-700', maintenance: 'bg-red-100 text-red-700', unpaid: 'bg-slate-100 text-slate-700',
};
export const Badge = ({ value }) => (
  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize whitespace-nowrap ${STATUS_COLORS[value] || 'bg-slate-100 text-slate-700'}`}>
    {String(value).replace(/_/g, ' ')}
  </span>
);
