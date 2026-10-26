import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

function PayForm({ bookingId, paymentIntentId, amount }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError('');
    const { error: stripeError } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    if (stripeError) {
      setError(stripeError.message);
      setPaying(false);
      return;
    }
    try {
      await axiosClient.post('/payments/verify', { bookingId, paymentIntentId });
      navigate('/my-bookings', { state: { justPaid: true } });
    } catch (err) {
      setError(err.response?.data?.message || 'Payment succeeded but confirmation failed. Check My Bookings shortly.');
      setPaying(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-5">
      <PaymentElement />
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <button
        disabled={!stripe || paying}
        className="w-full bg-navy-950 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer"
      >
        {paying ? 'Processing…' : `Pay $${amount}`}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [intent, setIntent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosClient.get(`/bookings/${bookingId}`);
        setBooking(data.data);
        if (data.data.paymentStatus === 'paid') return;
        const res = await axiosClient.post('/payments/create-intent', { bookingId });
        setIntent(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not start checkout');
      }
    })();
  }, [bookingId]);

  if (error) return <p className="text-center py-28 text-red-600">{error}</p>;
  if (!stripePromise) return <p className="text-center py-28 text-slate-600">Add VITE_STRIPE_PUBLISHABLE_KEY to client/.env to enable payments.</p>;
  if (!booking) return <div className="flex justify-center py-28"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;
  if (booking.paymentStatus === 'paid') return <p className="text-center py-28 text-slate-600">This booking is already paid.</p>;

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-black">Checkout</h1>
          <p className="text-sm text-slate-500 mt-1">
            Room {booking.room.roomNumber} · {booking.nights} night{booking.nights === 1 ? '' : 's'} ·{' '}
            {new Date(booking.checkInDate).toLocaleDateString()} → {new Date(booking.checkOutDate).toLocaleDateString()}
          </p>
        </div>
        {intent ? (
          <Elements stripe={stripePromise} options={{ clientSecret: intent.clientSecret }}>
            <PayForm bookingId={bookingId} paymentIntentId={intent.paymentIntentId} amount={intent.amount} />
          </Elements>
        ) : (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
        )}
      </div>
    </div>
  );
}
