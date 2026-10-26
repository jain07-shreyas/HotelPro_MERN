import { useCallback, useEffect, useRef, useState } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { apiError, fmtDateTime } from '../utils/format';

// One support conversation: used by guests (Support page) and by staff (dashboard).
export default function TicketThread({ ticketId, onChanged }) {
  const { user } = useAuth();
  const endRef = useRef(null);
  const [ticket, setTicket] = useState(null);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(
    () =>
      axiosClient
        .get(`/support/${ticketId}`)
        .then(({ data }) => setTicket(data.data))
        .catch((err) => setError(apiError(err, 'Could not load this ticket'))),
    [ticketId]
  );

  useEffect(() => { setTicket(null); setError(''); load(); }, [load]);
  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }); }, [ticket?.messages?.length]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError('');
    try {
      await axiosClient.post(`/support/${ticketId}/messages`, { text });
      setText('');
      await load();
      onChanged?.();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSending(false);
    }
  };

  const close = async () => {
    try {
      await axiosClient.patch(`/support/${ticketId}/close`);
      await load();
      onChanged?.();
    } catch (err) {
      setError(apiError(err));
    }
  };

  if (!ticket) return <p className="text-sm text-slate-500 p-6">{error || 'Loading…'}</p>;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl flex flex-col h-[28rem]">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold truncate">{ticket.subject}</p>
          <p className="text-xs text-slate-500">{ticket.guest?.name} · {ticket.status}</p>
        </div>
        {ticket.status === 'open' && (
          <button onClick={close} className="text-xs font-semibold border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg cursor-pointer shrink-0">
            Close ticket
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {ticket.messages.map((m) => {
          const mine = m.sender === user._id;
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-brand-500 text-navy-950' : 'bg-slate-100 text-slate-800'}`}>
                {!mine && <p className="text-[11px] font-bold opacity-70 mb-0.5">{m.senderName}{m.senderRole !== 'guest' ? ' (staff)' : ''}</p>}
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className="text-[10px] opacity-60 mt-1">{fmtDateTime(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="p-3 border-t border-slate-100 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder={ticket.status === 'closed' ? 'Write a reply to reopen this ticket…' : 'Write a reply…'}
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button disabled={sending} className="bg-navy-950 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-semibold px-4 rounded-xl cursor-pointer transition-colors">
          Send
        </button>
      </form>
      {error && <p className="text-xs text-red-600 px-4 pb-3">{error}</p>}
    </div>
  );
}
