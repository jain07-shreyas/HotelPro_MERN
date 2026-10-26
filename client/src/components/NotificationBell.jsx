import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { fmtDateTime } from '../utils/format';

export default function NotificationBell() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/notifications');
      setItems(data.data);
      setUnread(data.unreadCount);
    } catch {
      /* the bell is optional: fail quietly */
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => { if (!document.hidden) load(); }, 60000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const openItem = (n) => {
    setOpen(false);
    if (!n.isRead) {
      axiosClient.patch(`/notifications/${n._id}/read`).catch(() => {});
      setItems((prev) => prev.map((i) => (i._id === n._id ? { ...i, isRead: true } : i)));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    await axiosClient.patch('/notifications/read-all').catch(() => {});
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        aria-label="Notifications"
        className="relative p-2.5 rounded-xl border border-slate-700 hover:border-brand-500 text-slate-300 hover:text-brand-500 transition-colors cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-brand-500 text-navy-950 text-[11px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 max-w-[85vw] bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-bold text-sm">Notifications</span>
            {unread > 0 && <button onClick={markAll} className="text-xs text-brand-600 font-semibold cursor-pointer">Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">You are all caught up.</p>
            ) : (
              items.slice(0, 8).map((n) => (
                <button key={n._id} onClick={() => openItem(n)} className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-100 cursor-pointer ${n.isRead ? '' : 'bg-brand-50/60'}`}>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{fmtDateTime(n.createdAt)}</p>
                </button>
              ))
            )}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block text-center text-sm font-semibold text-brand-600 py-3">
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
