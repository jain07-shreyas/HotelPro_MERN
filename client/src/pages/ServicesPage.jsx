import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { apiError, fmtDate, fmtDateTime, label } from '../utils/format';

const TYPES = ['room_service', 'laundry', 'housekeeping', 'maintenance', 'extra_amenities', 'other'];
const badge = {
  open: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-sky-100 text-sky-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-700',
};

export default function ServicesPage() {
  const [requests, setRequests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ bookingId: '', type: 'room_service', description: '' });
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const [r, b] = await Promise.all([axiosClient.get('/services/mine'), axiosClient.get('/bookings/my-bookings')]);
      setRequests(r.data.data);
      const eligible = b.data.data.filter((x) => ['confirmed', 'checked_in'].includes(x.status));
      setBookings(eligible);
      setForm((f) => ({ ...f, bookingId: f.bookingId || eligible[0]?._id || '' }));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await axiosClient.post('/services', form);
      setForm((f) => ({ ...f, description: '' }));
      await load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSending(false);
    }
  };

  const cancel = async (id) => {
    try { await axiosClient.patch(`/services/${id}/cancel`); await load(); } catch (err) { setError(apiError(err)); }
  };

  const input = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500';
  if (loading) return <div className="flex justify-center py-28"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black">Services</h1>
        <p className="text-sm text-slate-500 mt-1">Need something during your stay? Our team will pick it up.</p>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {bookings.length === 0 ? (
        <p className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-500">
          Service requests are available once you have a confirmed or in-house booking.
        </p>
      ) : (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-5 grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase">Booking
            <select value={form.bookingId} onChange={(e) => setForm({ ...form, bookingId: e.target.value })} className={`${input} mt-1 normal-case font-normal`}>
              {bookings.map((b) => (
                <option key={b._id} value={b._id}>Room {b.room?.roomNumber} · {fmtDate(b.checkInDate)} → {fmtDate(b.checkOutDate)}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500 uppercase">What do you need?
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={`${input} mt-1 normal-case font-normal capitalize`}>
              {TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
            </select>
          </label>
          <textarea required maxLength={300} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe your request (e.g. two extra towels, 8 pm dinner for two)" className={`${input} sm:col-span-2`} />
          <button disabled={sending} className="sm:col-span-2 bg-navy-950 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl cursor-pointer transition-colors">
            {sending ? 'Sending…' : 'Send request'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r._id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm capitalize">{label(r.type)} <span className="text-slate-400 font-normal">· Room {r.room?.roomNumber}</span></p>
              <p className="text-sm text-slate-600 mt-0.5">{r.description}</p>
              {r.staffNote && <p className="text-xs text-slate-500 mt-1">Staff note: {r.staffNote}</p>}
              <p className="text-xs text-slate-400 mt-1">{fmtDateTime(r.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${badge[r.status]}`}>{label(r.status)}</span>
              {r.status === 'open' && (
                <button onClick={() => cancel(r._id)} className="text-xs font-semibold border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg cursor-pointer">Cancel</button>
              )}
            </div>
          </div>
        ))}
        {requests.length === 0 && <p className="text-center text-sm text-slate-500 py-6">No requests yet.</p>}
      </div>
    </div>
  );
}
