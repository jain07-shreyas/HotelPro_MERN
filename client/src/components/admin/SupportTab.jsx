import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import TicketThread from '../TicketThread';
import Pagination from '../Pagination';
import { Badge, ErrorNote, Spinner } from './ui';
import { apiError, fmtDateTime } from '../../utils/format';

export default function SupportTab() {
  const [tickets, setTickets] = useState([]);
  const [pg, setPg] = useState({ page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('open');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/support', { params: { page, limit: 10, ...(status && { status }) } });
      setTickets(data.data);
      setPg(data.pagination);
      setError('');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, status]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[['open', 'Open'], ['closed', 'Closed'], ['', 'All']].map(([value, text]) => (
          <button key={text} onClick={() => { setStatus(value); setPage(1); setSelected(null); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${status === value ? 'bg-navy-950 text-white' : 'bg-white border border-slate-200'}`}>{text}</button>
        ))}
      </div>
      <ErrorNote message={error} />
      <div className="grid lg:grid-cols-3 gap-6">
        <div>
          <div className="space-y-2">
            {tickets.map((t) => (
              <button key={t._id} onClick={() => setSelected(t._id)} className={`w-full text-left bg-white border rounded-xl p-3 cursor-pointer ${selected === t._id ? 'border-brand-500' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm truncate">{t.subject}</p>
                  <Badge value={t.status} />
                </div>
                <p className="text-xs text-slate-500 mt-1">{t.guest?.name} · {fmtDateTime(t.lastMessageAt)}</p>
              </button>
            ))}
            {tickets.length === 0 && <p className="text-sm text-slate-500 text-center py-8 bg-white border border-slate-200 rounded-xl">No tickets.</p>}
          </div>
          <Pagination page={pg.page} pages={pg.pages} onChange={setPage} />
        </div>
        <div className="lg:col-span-2">
          {selected ? <TicketThread ticketId={selected} onChanged={load} /> : <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-10 text-center">Select a ticket to reply.</p>}
        </div>
      </div>
    </div>
  );
}
