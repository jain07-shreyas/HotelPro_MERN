import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import downloadInvoice from '../utils/downloadInvoice';

const badge = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  checked_in: 'bg-sky-100 text-sky-800',
  checked_out: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function MyBookingsPage() {
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () =>
    axiosClient
      .get('/bookings/my-bookings')
      .then(({ data }) => setBookings(data.data))
      .catch(() => setError('Could not load your bookings'))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await axiosClient.patch(`/bookings/${id}/cancel`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not cancel');
    }
  };

  const invoice = async (id) => {
    try {
      await downloadInvoice(id);
    } catch {
      setError('Could not download the invoice');
    }
  };

  const canReview = (b) =>
    b.status === 'checked_out' || (b.status === 'confirmed' && b.paymentStatus === 'paid' && new Date(b.checkOutDate) < new Date());

  if (loading) return <div className="flex justify-center py-28"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-black mb-6">My Bookings</h1>
      {location.state?.justPaid && (
        <p className="mb-4 text-sm bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg px-4 py-3">Payment received. Your booking is confirmed!</p>
      )}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-600">No bookings yet.</p>
          <Link to="/rooms" className="text-brand-600 font-semibold text-sm">Browse rooms</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <div key={b._id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold">Room {b.room?.roomNumber} <span className="text-slate-400 font-normal">· {b.room?.category}</span></p>
                <p className="text-sm text-slate-500">
                  {new Date(b.checkInDate).toLocaleDateString()} → {new Date(b.checkOutDate).toLocaleDateString()} · {b.nights} night{b.nights === 1 ? '' : 's'} · ${b.totalAmount}
                </p>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge[b.status]}`}>{b.status.replace('_', ' ')}</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">{b.paymentStatus}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {b.paymentStatus === 'unpaid' && b.status === 'pending' && (
                  <Link to={`/checkout/${b._id}`} className="text-sm font-semibold bg-navy-950 hover:bg-brand-600 text-white px-4 py-2 rounded-xl transition-colors">Pay now</Link>
                )}
                {b.paymentStatus === 'paid' && (
                  <button onClick={() => invoice(b._id)} className="text-sm font-semibold border border-slate-200 hover:bg-slate-100 px-4 py-2 rounded-xl cursor-pointer">Invoice</button>
                )}
                {canReview(b) && b.room?._id && (
                  <Link to={`/rooms/${b.room._id}`} className="text-sm font-semibold border border-slate-200 hover:bg-slate-100 px-4 py-2 rounded-xl">Rate stay</Link>
                )}
                {['pending', 'confirmed'].includes(b.status) && (
                  <button onClick={() => cancel(b._id)} className="text-sm font-semibold border border-slate-200 hover:bg-slate-100 px-4 py-2 rounded-xl cursor-pointer">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
