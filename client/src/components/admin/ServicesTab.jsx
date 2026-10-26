import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import Pagination from '../Pagination';
import { Badge, ErrorNote, Spinner, btnCls, inputCls } from './ui';
import { apiError, fmtDateTime, label } from '../../utils/format';

export default function ServicesTab() {
  const [rows, setRows] = useState([]);
  const [pg, setPg] = useState({ page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/services', { params: { page, limit: 10, ...(status && { status }) } });
      setRows(data.data);
      setPg(data.pagination);
      setError('');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, status]);
  useEffect(() => { load(); }, [load]);

  const update = async (id, body) => {
    try { await axiosClient.patch(`/services/${id}`, body); await load(); } catch (err) { setError(apiError(err)); }
  };
  const complete = (r) => {
    const note = window.prompt('Note for the guest (optional)', r.staffNote || '');
    if (note === null) return;
    update(r._id, { status: 'completed', staffNote: note });
  };

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {[['open', 'Open'], ['in_progress', 'In progress'], ['completed', 'Completed'], ['', 'All']].map(([value, text]) => (
          <button key={text} onClick={() => { setStatus(value); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${status === value ? 'bg-navy-950 text-white' : 'bg-white border border-slate-200'}`}>{text}</button>
        ))}
      </div>
      <ErrorNote message={error} />
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r._id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm capitalize">{label(r.type)} <span className="text-slate-400 font-normal">· Room {r.room?.roomNumber} · {r.guest?.name}</span></p>
              <p className="text-sm text-slate-600 mt-0.5">{r.description}</p>
              {r.staffNote && <p className="text-xs text-slate-500 mt-1">Note: {r.staffNote}</p>}
              <p className="text-xs text-slate-400 mt-1">{fmtDateTime(r.createdAt)}{r.assignedTo ? ` · ${r.assignedTo.name}` : ''}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge value={r.status} />
              {r.status === 'open' && <button onClick={() => update(r._id, { status: 'in_progress' })} className={btnCls}>Start</button>}
              {['open', 'in_progress'].includes(r.status) && <button onClick={() => complete(r)} className={btnCls}>Complete</button>}
              {['open', 'in_progress'].includes(r.status) && <button onClick={() => window.confirm('Cancel this request?') && update(r._id, { status: 'cancelled' })} className={btnCls}>Cancel</button>}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-center text-sm text-slate-500 py-10 bg-white border border-slate-200 rounded-2xl">No requests.</p>}
      </div>
      <Pagination page={pg.page} pages={pg.pages} onChange={setPage} />
    </div>
  );
}
