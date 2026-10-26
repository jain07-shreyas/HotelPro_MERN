import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import RoomCard from '../components/RoomCard';
import Pagination from '../components/Pagination';
import { apiError } from '../utils/format';
import { Loader2 } from 'lucide-react';

const PAGE_SIZE = 9;

export default function RoomsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const checkIn = searchParams.get('checkIn') || new Date().toISOString().split('T')[0];
  const checkOut = searchParams.get('checkOut') || new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const adults = searchParams.get('adults') || 2;

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axiosClient.get('/rooms/available', {
          params: { checkIn, checkOut, adults, ...(category && { category }) },
        });
        setRooms(data.data || []);
        setPage(1);
      } catch (err) {
        console.error('Failed to load rooms:', err);
        setError(apiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, [category, checkIn, checkOut, adults]);

  const pages = Math.ceil(rooms.length / PAGE_SIZE);
  const visible = rooms.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Available Suites</h1>
          <p className="text-sm text-slate-500 mt-1">
            Displaying stays from <span className="font-semibold text-slate-800">{checkIn}</span> to <span className="font-semibold text-slate-800">{checkOut}</span>
            {rooms.length > 0 && <> · {rooms.length} room{rooms.length === 1 ? '' : 's'}</>}
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {['', 'Standard', 'Deluxe', 'Executive Suite', 'Presidential Suite'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                category === cat
                  ? 'bg-navy-950 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {cat === '' ? 'All Types' : cat}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-6 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>}

      {loading ? (
        <div className="flex justify-center items-center py-28">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <h3 className="text-base font-bold text-slate-800">No rooms available for this date combination</h3>
          <p className="text-sm text-slate-500 mt-1">Try modifying dates or select another category.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((room) => (
              <RoomCard
                key={room._id}
                room={room}
                onReserve={(r) => navigate(`/rooms/${r._id}?checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}`)}
              />
            ))}
          </div>
          <Pagination page={page} pages={pages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </>
      )}
    </div>
  );
}
