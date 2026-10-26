import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../Pagination';
import { Badge, ErrorNote, Spinner, Table, btnCls, inputCls, primaryBtn } from './ui';
import { apiError, fmtDate } from '../../utils/format';

const ROLES = ['guest', 'staff', 'manager', 'admin'];
const EMPTY = { name: '', email: '', password: '', role: 'staff', phone: '' };

export default function UsersTab() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState([]);
  const [pg, setPg] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/admin/users', { params: { page, limit: 10, ...(role && { role }), ...(query && { search: query }) } });
      setRows(data.data);
      setPg(data.pagination);
      setError('');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, role, query]);
  useEffect(() => { load(); }, [load]);

  const update = async (id, body) => {
    setNotice('');
    try { await axiosClient.patch(`/admin/users/${id}`, body); await load(); } catch (err) { setError(apiError(err)); }
  };

  const createStaff = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    try {
      await axiosClient.post('/admin/staff', form);
      setNotice(`Account created for ${form.email}. Share the password with them securely.`);
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(apiError(err));
    }
  };

  if (loading) return <Spinner />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <form onSubmit={createStaff} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold">Create a staff account</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input required placeholder="Full name" value={form.name} onChange={set('name')} className={inputCls} />
          <input required type="email" placeholder="Email" value={form.email} onChange={set('email')} className={inputCls} />
          <input required type="password" minLength={8} placeholder="Temporary password" value={form.password} onChange={set('password')} className={inputCls} />
          <select value={form.role} onChange={set('role')} className={inputCls}><option value="staff">staff</option><option value="manager">manager</option></select>
          <button className={primaryBtn}>Create account</button>
        </div>
        {notice && <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">{notice}</p>}
      </form>

      <ErrorNote message={error} />
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setQuery(search); setPage(1); }} className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className={inputCls} />
          <button className={btnCls}>Search</button>
        </form>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className={inputCls}>
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-sm text-slate-500 ml-auto">{pg.total} user{pg.total === 1 ? '' : 's'}</span>
      </div>

      <Table heads={['Name', 'Email', 'Role', 'Joined', 'Verified', 'Account']} empty={rows.length === 0 && 'No users found'}>
        {rows.map((u) => {
          const self = u._id === me._id;
          return (
            <tr key={u._id} className="border-t border-slate-100">
              <td className="px-4 py-3 font-semibold">{u.name}{self && <span className="ml-2 text-xs text-slate-400">(you)</span>}</td>
              <td className="px-4 py-3">{u.email}</td>
              <td className="px-4 py-3">
                <select value={u.role} disabled={self} onChange={(e) => window.confirm(`Change ${u.name}'s role to ${e.target.value}?`) && update(u._id, { role: e.target.value })} className={`${inputCls} py-1.5 disabled:opacity-60`}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">{fmtDate(u.createdAt)}</td>
              <td className="px-4 py-3">{u.isVerified ? 'Yes' : 'No'}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <Badge value={u.isActive === false ? 'deactivated' : 'active'} />
                {!self && (
                  <button onClick={() => window.confirm(u.isActive === false ? `Reactivate ${u.name}?` : `Deactivate ${u.name}? They will not be able to log in.`) && update(u._id, { isActive: u.isActive === false })} className={`${btnCls} ml-2`}>
                    {u.isActive === false ? 'Activate' : 'Deactivate'}
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </Table>
      <Pagination page={pg.page} pages={pg.pages} onChange={setPage} />
    </div>
  );
}
