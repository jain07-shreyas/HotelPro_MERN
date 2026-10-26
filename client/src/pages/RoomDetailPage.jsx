import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Users, BedDouble, Check } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import ReviewSection, { Stars } from '../components/ReviewSection';

const day = (d) => d.toISOString().split('T')[0];

export default function RoomDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    checkInDate: searchParams.get('checkIn') || day(new Date()),
    checkOutDate: searchParams.get('checkOut') || day(new Date(Date.now() + 86400000)),
    adults: Number(searchParams.get('adults')) || 2,
    children: 0,
    specialRequests: '',
  });

  const loadRoom = useCallback(
    () =>
      axiosClient
        .get(`/rooms/${id}`)
        .then(({ data }) => setRoom(data.data))
        .catch(() => setError('Room not found'))
        .finally(() => setLoading(false)),
    [id]
  );

  useEffect(() => { loadRoom(); }, [loadRoom]);

  // Price for the chosen dates, computed by the server (seasonal pricing included)
  const [quote, setQuote] = useState(null);
  useEffect(() => {
    if (!form.checkInDate || !form.checkOutDate) return undefined;
    let cancelled = false;
    axiosClient
      .get(`/rooms/${id}/quote`, { params: { checkIn: form.checkInDate, checkOut: form.checkOutDate } })
      .then(({ data }) => { if (!cancelled) setQuote(data.data); })
      .catch(() => { if (!cancelled) setQuote(null); });
    return () => { cancelled = true; };
  }, [id, form.checkInDate, form.checkOutDate]);

  if (loading) return <div className="flex justify-center py-28"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;
  if (!room) return <p className="text-center py-28 text-slate-600">{error || 'Room not found'}</p>;

  const nights = quote?.nights ?? Math.max(0, Math.ceil((new Date(form.checkOutDate) - new Date(form.checkInDate)) / 86400000));
  const total = quote?.total ?? nights * room.pricePerNight;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });

  const handleBook = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login', { state: { from: `/rooms/${id}` } });
    setError('');
    setSubmitting(true);
    try {
      const { data } = await axiosClient.post('/bookings', { roomId: id, ...form });
      navigate(`/checkout/${data.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const input = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <img
          src={room.images?.[0]?.url || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'}
          alt={`Room ${room.roomNumber}`}
          className="w-full h-80 object-cover rounded-2xl"
        />
        <div>
          <span className="text-xs font-semibold bg-slate-100 px-2.5 py-1 rounded-full">{room.category}</span>
          <h1 className="text-3xl font-black text-slate-900 mt-3">Room {room.roomNumber}</h1>
          {room.numReviews > 0 && (
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
              <Stars value={room.averageRating} /> {room.averageRating} · {room.numReviews} review{room.numReviews === 1 ? '' : 's'}
            </div>
          )}
          <div className="flex gap-5 text-sm text-slate-500 mt-2">
            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {room.capacity.adults} adults, {room.capacity.children} children</span>
            <span className="flex items-center gap-1"><BedDouble className="w-4 h-4" /> Floor {room.floor}</span>
          </div>
        </div>
        {room.description && <p className="text-slate-600">{room.description}</p>}
        <div className="flex flex-wrap gap-2">
          {room.amenities.map((a) => (
            <span key={a} className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              <Check className="w-3.5 h-3.5 text-brand-600" /> {a}
            </span>
          ))}
        </div>
        <ReviewSection roomId={room._id} onChanged={loadRoom} />
      </div>

      <form onSubmit={handleBook} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4 h-fit lg:sticky lg:top-28">
        <p className="text-2xl font-black">${room.pricePerNight} <span className="text-sm font-normal text-slate-500">/ night</span></p>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <label className="block text-xs font-bold text-slate-500 uppercase">Check-in
          <input type="date" required min={day(new Date())} value={form.checkInDate} onChange={set('checkInDate')} className={input} />
        </label>
        <label className="block text-xs font-bold text-slate-500 uppercase">Check-out
          <input type="date" required min={form.checkInDate} value={form.checkOutDate} onChange={set('checkOutDate')} className={input} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-bold text-slate-500 uppercase">Adults
            <input type="number" min={1} max={room.capacity.adults} value={form.adults} onChange={set('adults')} className={input} />
          </label>
          <label className="block text-xs font-bold text-slate-500 uppercase">Children
            <input type="number" min={0} max={room.capacity.children} value={form.children} onChange={set('children')} className={input} />
          </label>
        </div>
        <textarea placeholder="Special requests (optional)" maxLength={300} value={form.specialRequests} onChange={set('specialRequests')} className={input} rows={2} />
        {quote?.breakdown?.some((b) => b.label) && (
          <ul className="text-xs text-slate-500 space-y-1 border-t pt-3">
            {quote.breakdown.map((b) => (
              <li key={`${b.from}-${b.rate}`} className="flex justify-between gap-3">
                <span>{b.nights} × ${b.rate}{b.label ? ` · ${b.label}` : ''}</span>
                <span>${(b.nights * b.rate).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-between text-sm border-t pt-3">
          <span className="text-slate-500">{nights} night{nights === 1 ? '' : 's'}</span>
          <span className="font-bold">${total}</span>
        </div>
        <button
          disabled={submitting || nights < 1}
          className="w-full bg-navy-950 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer"
        >
          {submitting ? 'Reserving…' : user ? 'Reserve & Pay' : 'Login to Reserve'}
        </button>
        <p className="text-[11px] text-slate-400 text-center">Your room is held for 30 minutes while you pay.</p>
      </form>
    </div>
  );
}
