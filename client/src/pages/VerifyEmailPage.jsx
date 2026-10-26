import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../utils/format';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const { refreshUser } = useAuth();
  const ran = useRef(false); // React StrictMode runs effects twice in dev; the token can only be used once
  const [state, setState] = useState({ status: 'loading', message: '' });

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    axiosClient
      .post(`/auth/verify-email/${token}`)
      .then(({ data }) => {
        setState({ status: 'ok', message: data.message });
        refreshUser();
      })
      .catch((err) => setState({ status: 'error', message: apiError(err) }));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
      {state.status === 'loading' && <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto" />}
      {state.status === 'ok' && <CheckCircle2 className="w-12 h-12 text-brand-500 mx-auto" />}
      {state.status === 'error' && <XCircle className="w-12 h-12 text-red-500 mx-auto" />}
      <h1 className="text-2xl font-black">
        {state.status === 'loading' ? 'Verifying…' : state.status === 'ok' ? 'Email verified' : 'Verification failed'}
      </h1>
      {state.message && <p className="text-slate-500 text-sm">{state.message}</p>}
      <Link to="/" className="inline-block text-brand-600 font-semibold text-sm">Go to home</Link>
    </div>
  );
}
