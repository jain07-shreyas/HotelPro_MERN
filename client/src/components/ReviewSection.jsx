import { useEffect, useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

export function Stars({ value, size = 'w-4 h-4' }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= Math.round(value) ? 'fill-brand-500 text-brand-500' : 'text-slate-300'}`} />
      ))}
    </span>
  );
}

export default function ReviewSection({ roomId, onChanged }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [eligible, setEligible] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosClient.get(`/reviews/room/${roomId}`);
      setReviews(data.data);
      if (user) {
        const res = await axiosClient.get(`/reviews/eligible/${roomId}`);
        setEligible(res.data.data);
      }
    } catch {
      /* reviews are optional: fail quietly */
    }
  }, [roomId, user]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await axiosClient.post('/reviews', { bookingId: eligible.bookingId, rating, comment });
      setComment('');
      setRating(5);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      await axiosClient.delete(`/reviews/${id}`);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete review');
    }
  };

  return (
    <section id="reviews" className="space-y-4">
      <h2 className="text-xl font-black text-slate-900">Guest reviews</h2>

      {eligible && (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <p className="font-semibold text-sm">How was your stay?</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="cursor-pointer">
                <Star className={`w-7 h-7 ${n <= rating ? 'fill-brand-500 text-brand-500' : 'text-slate-300'}`} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Share a few words about the room (optional)"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={submitting} className="bg-navy-950 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl cursor-pointer transition-colors">
            {submitting ? 'Posting…' : 'Post review'}
          </button>
        </form>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-slate-500">No reviews yet. Guests can review after their stay.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r._id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">{r.guest?.name || 'Guest'}</span>
                  <Stars value={r.rating} />
                </div>
                <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              {r.comment && <p className="text-sm text-slate-600 mt-2">{r.comment}</p>}
              {user && (r.guest?._id === user._id || ['admin', 'manager'].includes(user.role)) && (
                <button onClick={() => remove(r._id)} className="text-xs text-red-600 hover:underline mt-2 cursor-pointer">Delete</button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
