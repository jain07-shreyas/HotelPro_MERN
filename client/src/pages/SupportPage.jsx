import { useEffect, useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import TicketThread from '../components/TicketThread';
import Pagination from '../components/Pagination';
import { apiError, fmtDateTime } from '../utils/format';

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (p = page) => {
    try {
      const { data } = await axiosClient.get('/support', { params: { page: p, limit: 10 } });
      setTickets(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await axiosClient.post('/support', form);
      setForm({ subject: '', message: '' });
      setCreating(false);
      setSelected(data.data._id);
      await load(1);
      setPage(1);
    } catch (err) {
      setError(apiError(err));
    }
  };

  const input = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500';
  if (loading) return <div className="flex justify-center py-28"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black">Support</h1>
          <p className="text-sm text-slate-500 mt-1">Questions about a booking, a payment or your stay? Message our team.</p>
        </div>
        <button onClick={() => { setCreating(true); setSelected(null); }}
          className="inline-flex items-center gap-2 bg-navy-950 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-colors">
          <Plus className="w-4 h-4" /> New ticket
        </button>
      </div>
      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div>
          <div className="space-y-2">
            {tickets.map((t) => (
              <button key={t._id} onClick={() => { setSelected(t._id); setCreating(false); }}
                className={`w-full text-left bg-white border rounded-xl p-3 cursor-pointer ${selected === t._id ? 'border-brand-500' : 'border-slate-200'}`}>
                <p className="font-semibold text-sm truncate">{t.subject}</p>
                <p className="text-xs text-slate-500 mt-0.5 flex justify-between"><span>{t.status}</span><span>{fmtDateTime(t.lastMessageAt)}</span></p>
              </button>
            ))}
            {tickets.length === 0 && <p className="text-sm text-slate-500 text-center py-8 bg-white border border-slate-200 rounded-xl">No tickets yet.</p>}
          </div>
          <Pagination page={pagination.page} pages={pagination.pages} onChange={setPage} />
        </div>

        <div className="lg:col-span-2">
          {creating ? (
            <form onSubmit={create} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h2 className="font-bold">New support ticket</h2>
              <input required maxLength={100} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className={input} />
              <textarea required maxLength={1000} rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="How can we help?" className={input} />
              <div className="flex gap-2">
                <button className="bg-navy-950 hover:bg-brand-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl cursor-pointer transition-colors">Send</button>
                <button type="button" onClick={() => setCreating(false)} className="text-sm font-semibold border border-slate-200 px-5 py-2.5 rounded-xl cursor-pointer">Cancel</button>
              </div>
            </form>
          ) : selected ? (
            <TicketThread ticketId={selected} onChanged={() => load(page)} />
          ) : (
            <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-10 text-center">Select a ticket or start a new one.</p>
          )}
        </div>
      </div>
    </div>
  );
}
