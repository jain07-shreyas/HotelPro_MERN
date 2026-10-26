import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form);
      navigate(location.state?.from || '/rooms');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.request
            ? 'Server se connect nahi ho paya. Server terminal check karo aur http://localhost:5000/api/v1/health kholkar dekho.'
            : 'Something went wrong. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const input = 'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500';

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-4">
        <h1 className="text-2xl font-black text-slate-900">{isLogin ? 'Welcome back' : 'Create your account'}</h1>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

        {!isLogin && (
          <input name="name" placeholder="Full name" required value={form.name} onChange={update} className={input} />
        )}
        <input name="email" type="email" placeholder="Email" required value={form.email} onChange={update} className={input} />
        <input
          name="password"
          type="password"
          placeholder="Password (min 8 characters)"
          required
          minLength={8}
          value={form.password}
          onChange={update}
          className={input}
        />

        {isLogin && (
          <p className="text-right -mt-2">
            <Link to="/forgot-password" className="text-xs text-brand-600 font-semibold">Forgot password?</Link>
          </p>
        )}

        <button
          disabled={submitting}
          className="w-full bg-navy-950 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors cursor-pointer"
        >
          {submitting ? 'Please wait…' : isLogin ? 'Login' : 'Sign Up'}
        </button>

        <p className="text-sm text-slate-500 text-center">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <Link to={isLogin ? '/register' : '/login'} className="text-brand-600 font-semibold">
            {isLogin ? 'Sign Up' : 'Login'}
          </Link>
        </p>
      </form>
    </div>
  );
}
