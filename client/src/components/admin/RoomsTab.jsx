import { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import { Badge, ErrorNote, Spinner, Table, btnCls, dangerBtn, inputCls, primaryBtn } from './ui';
import { apiError, money } from '../../utils/format';

const CATEGORIES = ['Standard', 'Deluxe', 'Executive Suite', 'Presidential Suite'];
const STATUSES = ['available', 'occupied', 'cleaning', 'maintenance'];
const EMPTY = { roomNumber: '', category: 'Standard', pricePerNight: 100, floor: 1, adults: 2, children: 0, description: '', amenities: '', imageUrl: '' };

const toForm = (r) => ({
  roomNumber: r.roomNumber,
  category: r.category,
  pricePerNight: r.pricePerNight,
  floor: r.floor ?? 1,
  adults: r.capacity?.adults ?? 2,
  children: r.capacity?.children ?? 0,
  description: r.description || '',
  amenities: (r.amenities || []).join(', '),
  imageUrl: r.images?.[0]?.url || '',
});

export default function RoomsTab() {
  const { user } = useAuth();
  const canManage = ['admin', 'manager'].includes(user.role);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null); // the room being edited, or null when adding
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosClient.get('/rooms');
      setRooms(data.data);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setError('');
    try { await fn(); await load(); } catch (err) { setError(apiError(err)); }
  };

  const reset = () => { setForm(EMPTY); setEditing(null); };
  const startEdit = (r) => { setEditing(r); setForm(toForm(r)); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const uploadImage = async (file) => {
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await axiosClient.post('/uploads/room-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, imageUrl: data.url }));
    } catch (err) {
      setError(apiError(err, 'Image upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      roomNumber: form.roomNumber,
      category: form.category,
      pricePerNight: Number(form.pricePerNight),
      floor: Number(form.floor),
      capacity: { adults: Number(form.adults), children: Number(form.children) },
      description: form.description,
      amenities: form.amenities.split(',').map((a) => a.trim()).filter(Boolean),
    };
    // Only touch the photos when the image was changed (keeps extra photos of an existing room)
    const originalImage = editing?.images?.[0]?.url || '';
    if (!editing || form.imageUrl !== originalImage) payload.images = form.imageUrl ? [{ url: form.imageUrl }] : [];

    await run(async () => {
      if (editing) await axiosClient.put(`/rooms/${editing._id}`, payload);
      else await axiosClient.post('/rooms', payload);
      reset();
    });
    setSaving(false);
  };

  if (loading) return <Spinner />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <ErrorNote message={error} />

      {canManage && (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{editing ? `Edit room ${editing.roomNumber}` : 'Add a room'}</h2>
            {editing && <button type="button" onClick={reset} className={btnCls}>Cancel editing</button>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input required placeholder="Room no." value={form.roomNumber} onChange={set('roomNumber')} className={inputCls} />
            <select value={form.category} onChange={set('category')} className={inputCls}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            <input type="number" min={0} step="0.01" required placeholder="Price / night" value={form.pricePerNight} onChange={set('pricePerNight')} className={inputCls} />
            <input type="number" required placeholder="Floor" value={form.floor} onChange={set('floor')} className={inputCls} />
            <input type="number" min={1} placeholder="Adults" value={form.adults} onChange={set('adults')} className={inputCls} />
            <input type="number" min={0} placeholder="Children" value={form.children} onChange={set('children')} className={inputCls} />
            <input placeholder="Amenities (comma separated)" value={form.amenities} onChange={set('amenities')} className={`${inputCls} col-span-2`} />
            <input placeholder="Description" maxLength={500} value={form.description} onChange={set('description')} className={`${inputCls} col-span-2 md:col-span-3`} />
            <div className="col-span-2 flex items-center gap-3">
              <label className={`${btnCls} whitespace-nowrap`}>
                {uploading ? 'Uploading…' : form.imageUrl ? 'Change image' : 'Upload image'}
                <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => uploadImage(e.target.files[0])} />
              </label>
              {form.imageUrl && <img src={form.imageUrl} alt="Preview" className="h-10 w-14 object-cover rounded" />}
            </div>
            <button disabled={saving || uploading} className={primaryBtn}>{editing ? 'Save changes' : 'Add room'}</button>
          </div>
        </form>
      )}

      <Table heads={['Room', 'Category', 'Floor', 'Price', 'Rating', 'Status', '']} empty={rooms.length === 0 && 'No rooms yet'}>
        {rooms.map((r) => (
          <tr key={r._id} className="border-t border-slate-100">
            <td className="px-4 py-3 font-semibold">{r.roomNumber}</td>
            <td className="px-4 py-3">{r.category}</td>
            <td className="px-4 py-3">{r.floor}</td>
            <td className="px-4 py-3">{money(r.pricePerNight)}</td>
            <td className="px-4 py-3">{r.numReviews > 0 ? `${r.averageRating} (${r.numReviews})` : '-'}</td>
            <td className="px-4 py-3">
              <select value={r.status} onChange={(e) => run(() => axiosClient.put(`/rooms/${r._id}`, { status: e.target.value }))} className={inputCls}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <span className="ml-2 hidden sm:inline"><Badge value={r.status} /></span>
            </td>
            <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
              {canManage && <button onClick={() => startEdit(r)} className={btnCls}>Edit</button>}
              {canManage && (
                <button onClick={() => window.confirm(`Delete room ${r.roomNumber}?`) && run(() => axiosClient.delete(`/rooms/${r._id}`))} className={dangerBtn}>Delete</button>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
