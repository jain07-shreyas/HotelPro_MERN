import { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../utils/format';

export default function VerifyBanner() {
  const { user } = useAuth();
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  if (!user || user.isVerified) return null;

  const resend = async () => {
    setSending(true);
    try {
      const { data } = await axiosClient.post('/auth/resend-verification');
      setMsg(data.message);
    } catch (err) {
      setMsg(apiError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>{msg || 'Please verify your email address. We sent you a link when you signed up.'}</span>
        <button onClick={resend} disabled={sending} className="font-semibold underline disabled:opacity-60 cursor-pointer">
          {sending ? 'Sending…' : 'Resend link'}
        </button>
      </div>
    </div>
  );
}
