import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../utils/format';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    setSaving(true);
    setError('');
    try {
      const { data } = await axiosClient.post(`/auth/reset-password/${token}`, { password });
      setUser(data.data); // the server also logs you in
      navigate('/');
    } catch (err) {
      setError(apiError(err));
      setSaving(false);
    }
  };

  const input = 'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500';
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-4">
        <h1 className="text-2xl font-black">Choose a new password</h1>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <input type="password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 8 characters)" className={input} />
        <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat new password" className={input} />
        <button disabled={saving} className="w-full bg-navy-950 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl cursor-pointer transition-colors">
          {saving ? 'Saving…' : 'Update password'}
        </button>
        <p className="text-sm text-center"><Link to="/forgot-password" className="text-brand-600 font-semibold">Need a new link?</Link></p>
      </form>
    </div>
  );
}
