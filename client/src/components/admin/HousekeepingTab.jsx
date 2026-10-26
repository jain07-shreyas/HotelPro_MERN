import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { Badge, ErrorNote, Spinner, btnCls, dangerBtn, inputCls, primaryBtn } from './ui';
import { apiError, fmtDateTime } from '../../utils/format';

const PRIORITY = { high: 'bg-red-100 text-red-700', normal: 'bg-slate-100 text-slate-700', low: 'bg-slate-100 text-slate-500' };

export default function HousekeepingTab() {
  const { user } = useAuth();
  const isManager = ['admin', 'manager'].includes(user.role);
  const [tasks, setTasks] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [filter, setFilter] = useState('active');
  const [form, setForm] = useState({ roomId: '', type: 'cleaning', priority: 'normal', notes: '', assignedTo: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const params = filter === 'mine' ? { mine: 'true' } : ['pending', 'in_progress', 'done'].includes(filter) ? { status: filter } : {};
      const { data } = await axiosClient.get('/housekeeping', { params });
      setTasks(filter === 'active' ? data.data.filter((t) => t.status !== 'done') : data.data);
      setError('');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    axiosClient.get('/rooms').then(({ data }) => {
      setRooms(data.data);
      setForm((f) => ({ ...f, roomId: f.roomId || data.data[0]?._id || '' }));
    }).catch(() => {});
    if (isManager) axiosClient.get('/admin/staff').then(({ data }) => setStaff(data.data)).catch(() => {});
  }, [isManager]);

  const run = async (fn) => {
    setError('');
    try { await fn(); await load(); } catch (err) { setError(apiError(err)); }
  };
  const patch = (id, body) => run(() => axiosClient.patch(`/housekeeping/${id}`, body));

  const create = (e) => {
    e.preventDefault();
    run(async () => {
      await axiosClient.post('/housekeeping', { ...form, assignedTo: form.assignedTo || undefined });
      setForm((f) => ({ ...f, notes: '', assignedTo: '' }));
    });
  };

  if (loading) return <Spinner />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="bg-white border border-slate-200 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-6 gap-3">
        <select value={form.roomId} onChange={set('roomId')} className={inputCls} required>
          {rooms.map((r) => <option key={r._id} value={r._id}>Room {r.roomNumber}</option>)}
        </select>
        <select value={form.type} onChange={set('type')} className={inputCls}>
          {['cleaning', 'maintenance', 'inspection'].map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={form.priority} onChange={set('priority')} className={inputCls}>
          {['low', 'normal', 'high'].map((t) => <option key={t}>{t}</option>)}
        </select>
        {isManager ? (
          <select value={form.assignedTo} onChange={set('assignedTo')} className={inputCls}>
            <option value="">Unassigned</option>
            {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        ) : <span />}
        <input placeholder="Notes" maxLength={300} value={form.notes} onChange={set('notes')} className={`${inputCls} col-span-2 md:col-span-1`} />
        <button className={primaryBtn}>Create task</button>
      </form>

      <div className="flex gap-2 flex-wrap">
        {[['active', 'Open tasks'], ['mine', 'Assigned to me'], ['done', 'Completed'], ['', 'All']].map(([value, text]) => (
          <button key={text} onClick={() => setFilter(value)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${filter === value ? 'bg-navy-950 text-white' : 'bg-white border border-slate-200'}`}>{text}</button>
        ))}
      </div>
      <ErrorNote message={error} />

      <div className="grid md:grid-cols-2 gap-4">
        {tasks.map((t) => (
          <div key={t._id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">Room {t.room?.roomNumber} <span className="text-slate-400 font-normal capitalize">· {t.type}</span></p>
                {t.notes && <p className="text-sm text-slate-600 mt-0.5">{t.notes}</p>}
                <p className="text-xs text-slate-400 mt-1">{fmtDateTime(t.createdAt)} · {t.assignedTo ? `assigned to ${t.assignedTo.name}` : 'unassigned'}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Badge value={t.status} />
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${PRIORITY[t.priority]}`}>{t.priority}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {t.status === 'pending' && <button onClick={() => patch(t._id, { status: 'in_progress' })} className={btnCls}>Start</button>}
              {t.status !== 'done' && <button onClick={() => patch(t._id, { status: 'done' })} className={btnCls}>Mark done</button>}
              {t.status !== 'done' && !t.assignedTo && <button onClick={() => patch(t._id, { claim: true })} className={btnCls}>Claim</button>}
              {isManager && t.status !== 'done' && (
                <select value={t.assignedTo?._id || ''} onChange={(e) => patch(t._id, { assignedTo: e.target.value })} className={`${inputCls} text-xs py-1.5`}>
                  <option value="">Unassigned</option>
                  {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              )}
              {isManager && <button onClick={() => window.confirm('Delete this task?') && run(() => axiosClient.delete(`/housekeeping/${t._id}`))} className={dangerBtn}>Delete</button>}
            </div>
          </div>
        ))}
        {tasks.length === 0 && <p className="md:col-span-2 text-center text-sm text-slate-500 py-10 bg-white border border-slate-200 rounded-2xl">Nothing here. Tasks appear automatically after a guest checks out.</p>}
      </div>
    </div>
  );
}
