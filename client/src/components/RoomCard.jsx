import React from 'react';
import { Users, BedDouble, Check, Star } from 'lucide-react';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80';

export default function RoomCard({ room, onReserve }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
      <div className="relative h-52 bg-slate-100 overflow-hidden">
        <img
          src={room.images?.[0]?.url || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'}
          alt={room.roomNumber}
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = FALLBACK_IMG; }}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
        <span className="absolute top-3 right-3 bg-navy-950/80 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full font-medium">
          {room.category}
        </span>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Room {room.roomNumber}</h3>
              {room.numReviews > 0 && (
                <span className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  <Star className="w-3.5 h-3.5 fill-brand-500 text-brand-500" /> {room.averageRating} ({room.numReviews})
                </span>
              )}
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-slate-900">${room.avgRate ?? room.pricePerNight}</span>
              <span className="text-xs text-slate-500 block">/ night{room.stayNights > 1 ? ` · $${room.stayTotal} total` : ''}</span>
              {room.avgRate !== undefined && Math.abs(room.avgRate - room.pricePerNight) > 0.005 && (
                <span className="text-[11px] text-brand-600 font-semibold block">Seasonal price</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-brand-600" /> Up to {room.capacity?.adults || 2} Guests
            </span>
            <span className="flex items-center gap-1">
              <BedDouble className="w-3.5 h-3.5 text-brand-600" /> Floor {room.floor || 1}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-5">
            {(room.amenities?.length ? room.amenities : ['WiFi', 'Air Conditioning', 'Ensuite Bathroom'])
              .slice(0, 3)
              .map((item, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                  <Check className="w-3 h-3 text-brand-600" /> {item}
                </span>
              ))}
          </div>
        </div>

        <button
          onClick={() => onReserve(room)}
          className="w-full bg-navy-950 hover:bg-brand-600 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm cursor-pointer"
        >
          Reserve Room
        </button>
      </div>
    </div>
  );
}