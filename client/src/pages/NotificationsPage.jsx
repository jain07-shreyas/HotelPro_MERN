import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { fmtDateTime } from '../utils/format';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    axiosClient.get('/notifications').then(({ data }) => setItems(data.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const open = async (n) => {
    if (!n.isRead) await axiosClient.patch(`/notifications/${n._id}/read`).catch(() => {});
    if (n.link) navigate(n.link);
    else load();
  };
  const markAll = async () => { await axiosClient.patch('/notifications/read-all'); load(); };

  if (loading) return <div className="flex justify-center py-28"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black">Notifications</h1>
        {items.some((i) => !i.isRead) && (
          <button onClick={markAll} className="text-sm font-semibold text-brand-600 cursor-pointer">Mark all as read</button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-center py-16 bg-white border border-slate-200 rounded-2xl text-slate-500">No notifications yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <button key={n._id} onClick={() => open(n)}
              className={`w-full text-left bg-white border rounded-2xl p-4 cursor-pointer hover:shadow-sm ${n.isRead ? 'border-slate-200' : 'border-brand-500'}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-sm">{n.title}</p>
                <span className="text-xs text-slate-400 shrink-0">{fmtDateTime(n.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{n.message}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
