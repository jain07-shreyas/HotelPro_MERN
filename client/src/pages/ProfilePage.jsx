import { useState } from 'react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';

const input = 'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({ name: user.name || '', phone: user.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [profileMsg, setProfileMsg] = useState(null); // { ok, text }
  const [pwMsg, setPwMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setProfileMsg(null);
    try {
      const { data } = await axiosClient.put('/profile', profile);
      setUser(data.data);
      setProfileMsg({ ok: true, text: 'Profile updated' });
    } catch (err) {
      setProfileMsg({ ok: false, text: err.response?.data?.message || 'Could not update profile' });
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    try {
      await axiosClient.put('/profile/password', pw);
      setPw({ currentPassword: '', newPassword: '' });
      setPwMsg({ ok: true, text: 'Password changed' });
    } catch (err) {
      setPwMsg({ ok: false, text: err.response?.data?.message || 'Could not change password' });
    }
  };

  const Msg = ({ m }) =>
    m && <p className={`text-sm rounded-lg px-3 py-2 ${m.ok ? 'text-emerald-800 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>{m.text}</p>;

  return (
    <div className="max-w-xl mx-auto px-4 py-12 space-y-8">
      <h1 className="text-3xl font-black">My Profile</h1>

      <form onSubmit={saveProfile} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
          <p className="text-sm mt-1">{user.email} <span className="ml-2 text-xs bg-slate-100 px-2 py-0.5 rounded-full capitalize">{user.role}</span></p>
        </div>
        <label className="block text-xs font-bold text-slate-500 uppercase">Full name
          <input required maxLength={50} value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={`${input} mt-1 normal-case font-normal`} />
        </label>
        <label className="block text-xs font-bold text-slate-500 uppercase">Phone
          <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 98765 43210" className={`${input} mt-1 normal-case font-normal`} />
        </label>
        <Msg m={profileMsg} />
        <button disabled={saving} className="bg-navy-950 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl cursor-pointer transition-colors">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <form onSubmit={savePassword} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <h2 className="font-bold">Change password</h2>
        <input type="password" required placeholder="Current password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} className={input} />
        <input type="password" required minLength={8} placeholder="New password (min 8 characters)" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} className={input} />
        <Msg m={pwMsg} />
        <button className="bg-navy-950 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl cursor-pointer transition-colors">Update password</button>
      </form>
    </div>
  );
}
