import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import Pagination from '../Pagination';
import { Badge, ErrorNote, Spinner, Table, btnCls, inputCls } from './ui';
import { apiError, fmtDate, money } from '../../utils/format';

const ACTIONS = {
  pending: [['confirmed', 'Confirm'], ['cancelled', 'Cancel']],
  confirmed: [['checked_in', 'Check in'], ['cancelled', 'Cancel']],
  checked_in: [['checked_out', 'Check out']],
};

export default function BookingsTab() {
  const [rows, setRows] = useState([]);
  const [pg, setPg] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/bookings', { params: { page, limit: 10, ...(status && { status }) } });
      setRows(data.data);
      setPg(data.pagination);
      setError('');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, status]);
  useEffect(() => { load(); }, [load]);

  const change = async (b, next) => {
    if (next === 'cancelled' && !window.confirm(b.paymentStatus === 'paid' ? 'Cancel this booking? The guest will be refunded in full.' : 'Cancel this booking?')) return;
    try {
      await axiosClient.patch(`/bookings/${b._id}/status`, { status: next });
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  };

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{pg.total} booking{pg.total === 1 ? '' : 's'}</p>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All statuses</option>
          {['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>
      <ErrorNote message={error} />
      <Table heads={['Guest', 'Room', 'Dates', 'Total', 'Status', 'Payment', 'Actions']} empty={rows.length === 0 && 'No bookings found'}>
        {rows.map((b) => (
          <tr key={b._id} className="border-t border-slate-100">
            <td className="px-4 py-3">{b.guest?.name}<div className="text-xs text-slate-400">{b.guest?.email}</div></td>
            <td className="px-4 py-3">{b.room?.roomNumber}</td>
            <td className="px-4 py-3 whitespace-nowrap">{fmtDate(b.checkInDate)} → {fmtDate(b.checkOutDate)}</td>
            <td className="px-4 py-3">{money(b.totalAmount)}</td>
            <td className="px-4 py-3"><Badge value={b.status} /></td>
            <td className="px-4 py-3"><Badge value={b.paymentStatus} /></td>
            <td className="px-4 py-3 space-x-2 whitespace-nowrap">
              {(ACTIONS[b.status] || []).map(([next, text]) => (
                <button key={next} onClick={() => change(b, next)} className={btnCls}>{text}</button>
              ))}
            </td>
          </tr>
        ))}
      </Table>
      <Pagination page={pg.page} pages={pg.pages} onChange={setPage} />
    </div>
  );
}
