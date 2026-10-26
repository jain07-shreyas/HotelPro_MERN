import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import Pagination from '../Pagination';
import { ErrorNote, Spinner, StatCard, Table, inputCls } from './ui';
import { apiError, fmtDateTime } from '../../utils/format';

const uptime = (s) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
};
const Flag = ({ on, text }) => (
  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${on ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{text}: {on ? 'on' : 'off'}</span>
);
const summarize = (d) => (d && Object.keys(d).length ? Object.entries(d).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ') : '');

export default function SecurityTab() {
  const [sys, setSys] = useState(null);
  const [logs, setLogs] = useState([]);
  const [actions, setActions] = useState([]);
  const [action, setAction] = useState('');
  const [pg, setPg] = useState({ page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    axiosClient.get('/admin/system').then(({ data }) => setSys(data.data)).catch((err) => setError(apiError(err)));
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/admin/logs', { params: { page, limit: 15, ...(action && { action }) } });
      setLogs(data.data);
      setActions(data.actions);
      setPg(data.pagination);
    } catch (err) {
      setError(apiError(err));
    }
  }, [page, action]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  if (!sys && !error) return <Spinner />;
  return (
    <div className="space-y-8">
      <ErrorNote message={error} />
      {sys && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Database" value={sys.database} hint={`Node ${sys.node} · ${sys.environment}`} />
            <StatCard title="Uptime" value={uptime(sys.uptimeSeconds)} hint={`${sys.memoryMB} MB memory`} />
            <StatCard title="Failed logins (24h)" value={sys.security.failedLogins24h} hint={`${sys.security.deactivatedUsers} deactivated accounts`} />
            <StatCard title="Server errors logged" value={sys.errorLog.exists ? `${sys.errorLog.sizeKB} KB` : 'None'} hint="server/logs/error.log" />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-sm">Platform configuration</h3>
            <div className="flex flex-wrap gap-2">
              <Flag on={sys.services.email} text="Email (SMTP)" />
              <Flag on={sys.services.stripe} text="Stripe payments" />
              <Flag on={sys.services.cloudinary} text="Cloudinary images" />
              <Flag on={sys.services.emailVerificationRequired} text="Email verification required" />
            </div>
            <p className="text-xs text-slate-500">
              {sys.counts.users} users · {sys.counts.rooms} rooms · {sys.counts.bookings} bookings · {sys.counts.openTickets} open support tickets. These settings come from the server's .env file.
            </p>
          </div>

          {sys.security.recentFailed.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-sm">Recent failed logins</h3>
              <Table heads={['When', 'Email tried', 'IP address']}>
                {sys.security.recentFailed.map((f) => (
                  <tr key={f._id} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 whitespace-nowrap">{fmtDateTime(f.createdAt)}</td>
                    <td className="px-4 py-2.5">{f.details?.email}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{f.ip}</td>
                  </tr>
                ))}
              </Table>
            </div>
          )}
        </>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-sm">Activity log</h3>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className={inputCls}>
            <option value="">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <Table heads={['When', 'Who', 'Action', 'Details', 'IP']} empty={logs.length === 0 && 'No activity recorded yet'}>
          {logs.map((l) => (
            <tr key={l._id} className="border-t border-slate-100 align-top">
              <td className="px-4 py-2.5 whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
              <td className="px-4 py-2.5">{l.actorName || '-'}{l.actorRole && <span className="text-xs text-slate-400"> ({l.actorRole})</span>}</td>
              <td className="px-4 py-2.5 whitespace-nowrap font-semibold">{l.action.replace(/_/g, ' ')}</td>
              <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs break-words">{summarize(l.details)}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{l.ip}</td>
            </tr>
          ))}
        </Table>
        <Pagination page={pg.page} pages={pg.pages} onChange={setPage} />
      </div>
    </div>
  );
}
