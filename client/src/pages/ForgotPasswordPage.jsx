import { useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { apiError } from '../utils/format';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const { data } = await axiosClient.post('/auth/forgot-password', { email });
      setDone(data.message);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-4">
        <h1 className="text-2xl font-black">Forgot your password?</h1>
        <p className="text-sm text-slate-500">Enter your email and we will send you a link to choose a new one.</p>
        {done ? (
          <>
            <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">{done}</p>
            <p className="text-xs text-slate-500">No email? If the server has no SMTP settings, the link is printed in the server terminal.</p>
          </>
        ) : (
          <>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500" />
            <button disabled={sending} className="w-full bg-navy-950 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl cursor-pointer transition-colors">
              {sending ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        )}
        <p className="text-sm text-center"><Link to="/login" className="text-brand-600 font-semibold">Back to login</Link></p>
      </form>
    </div>
  );
}
