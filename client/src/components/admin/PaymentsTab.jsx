import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import Pagination from '../Pagination';
import { Badge, ErrorNote, Spinner, StatCard, Table, inputCls } from './ui';
import { apiError, fmtDateTime, money } from '../../utils/format';

export default function PaymentsTab() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pg, setPg] = useState({ page: 1, pages: 1 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/admin/payments', { params: { page, limit: 10, ...(status && { status }) } });
      setRows(data.data);
      setSummary(data.summary);
      setPg(data.pagination);
      setError('');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, status]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Collected" value={money(summary.succeeded.total)} hint={`${summary.succeeded.count} payments`} />
          <StatCard title="Refunded" value={money(summary.refunded.total)} hint={`${summary.refunded.count} refunds`} />
        </div>
      )}
      <div className="flex justify-end">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All payments</option>
          {['succeeded', 'refunded', 'pending', 'failed'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <ErrorNote message={error} />
      <Table heads={['Date', 'Guest', 'Room', 'Amount', 'Status', 'Reference', 'Receipt']} empty={rows.length === 0 && 'No payments found'}>
        {rows.map((p) => (
          <tr key={p._id} className="border-t border-slate-100">
            <td className="px-4 py-3 whitespace-nowrap">{fmtDateTime(p.createdAt)}</td>
            <td className="px-4 py-3">{p.guest?.name}<div className="text-xs text-slate-400">{p.guest?.email}</div></td>
            <td className="px-4 py-3">{p.booking?.room?.roomNumber || '-'}</td>
            <td className="px-4 py-3 font-semibold">{money(p.amount)}</td>
            <td className="px-4 py-3"><Badge value={p.status} /></td>
            <td className="px-4 py-3 text-xs text-slate-500 font-mono">{p.transactionId}</td>
            <td className="px-4 py-3">{p.receiptUrl ? <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="text-brand-600 font-semibold text-xs">View</a> : '-'}</td>
          </tr>
        ))}
      </Table>
      <Pagination page={pg.page} pages={pg.pages} onChange={setPage} />
    </div>
  );
}
