import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { Badge, ErrorNote, Spinner, Table, btnCls, dangerBtn, inputCls, primaryBtn } from './ui';
import { apiError, fmtDate } from '../../utils/format';

const CATEGORIES = ['Standard', 'Deluxe', 'Executive Suite', 'Presidential Suite'];
const EMPTY = { name: '', startDate: '', endDate: '', multiplier: 1.25, categories: [], isActive: true };
const day = (d) => new Date(d).toISOString().slice(0, 10);

export default function PricingTab() {
  const [seasons, setSeasons] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/pricing/seasons');
      setSeasons(data.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setError('');
    try { await fn(); await load(); return true; } catch (err) { setError(apiError(err)); return false; }
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, multiplier: Number(form.multiplier) };
    const ok = await run(() => (editingId ? axiosClient.put(`/pricing/seasons/${editingId}`, body) : axiosClient.post('/pricing/seasons', body)));
    if (ok) { setForm(EMPTY); setEditingId(null); }
  };

  const edit = (s) => {
    setEditingId(s._id);
    setForm({ name: s.name, startDate: day(s.startDate), endDate: day(s.endDate), multiplier: s.multiplier, categories: s.categories || [], isActive: s.isActive });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const toggleCategory = (c) =>
    setForm((f) => ({ ...f, categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c] }));

  if (loading) return <Spinner />;
  const percent = (m) => `${m >= 1 ? '+' : ''}${Math.round((m - 1) * 100)}%`;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Seasonal prices change the nightly rate for every night inside their dates. If seasons overlap, the highest multiplier wins.
        To change a room's base price, edit the room in the Rooms tab.
      </p>
      <ErrorNote message={error} />

      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{editingId ? 'Edit season' : 'Add a season'}</h2>
          {editingId && <button type="button" className={btnCls} onClick={() => { setEditingId(null); setForm(EMPTY); }}>Cancel editing</button>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input required maxLength={60} placeholder="Name (e.g. Diwali week)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputCls} col-span-2 md:col-span-1`} />
          <label className="text-xs text-slate-500">From<input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={`${inputCls} w-full mt-1`} /></label>
          <label className="text-xs text-slate-500">To (included)<input type="date" required value={form.endDate} min={form.startDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={`${inputCls} w-full mt-1`} /></label>
          <label className="text-xs text-slate-500">Multiplier ({percent(Number(form.multiplier) || 1)})
            <input type="number" required min={0.1} max={5} step="0.05" value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: e.target.value })} className={`${inputCls} w-full mt-1`} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-xs font-bold text-slate-500 uppercase">Applies to</span>
          {CATEGORIES.map((c) => (
            <label key={c} className="flex items-center gap-1.5"><input type="checkbox" checked={form.categories.includes(c)} onChange={() => toggleCategory(c)} /> {c}</label>
          ))}
          <span className="text-xs text-slate-400">(none ticked = all rooms)</span>
          <label className="flex items-center gap-1.5 ml-auto"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
        </div>
        <button className={primaryBtn}>{editingId ? 'Save season' : 'Add season'}</button>
      </form>

      <Table heads={['Season', 'Dates', 'Price change', 'Rooms', 'Status', '']} empty={seasons.length === 0 && 'No seasonal prices yet'}>
        {seasons.map((s) => (
          <tr key={s._id} className="border-t border-slate-100">
            <td className="px-4 py-3 font-semibold">{s.name}</td>
            <td className="px-4 py-3 whitespace-nowrap">{fmtDate(s.startDate)} → {fmtDate(s.endDate)}</td>
            <td className="px-4 py-3">{percent(s.multiplier)} <span className="text-slate-400">(x{s.multiplier})</span></td>
            <td className="px-4 py-3">{s.categories?.length ? s.categories.join(', ') : 'All'}</td>
            <td className="px-4 py-3"><Badge value={s.isActive ? 'active' : 'paused'} /></td>
            <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
              <button onClick={() => run(() => axiosClient.put(`/pricing/seasons/${s._id}`, { isActive: !s.isActive }))} className={btnCls}>{s.isActive ? 'Pause' : 'Activate'}</button>
              <button onClick={() => edit(s)} className={btnCls}>Edit</button>
              <button onClick={() => window.confirm(`Delete "${s.name}"?`) && run(() => axiosClient.delete(`/pricing/seasons/${s._id}`))} className={dangerBtn}>Delete</button>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
