import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Users, Zap, Shield, Sparkles } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const [params, setParams] = useState({
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    adults: 2,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate(`/rooms?checkIn=${params.checkIn}&checkOut=${params.checkOut}&adults=${params.adults}`);
  };

  return (
    <div>
      {/* Hero Header */}
      <section className="bg-navy-950 text-white pt-20 pb-28 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Luxury Hospitality Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            High-Speed Bookings. <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-brand-500 to-teal-300">
              World-Class Comfort.
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            Real-time synchronization across rooms and suites worldwide with zero double-booking conflicts.
          </p>

          {/* Search Console */}
          <div className="pt-6">
            <form
              onSubmit={handleSubmit}
              className="bg-white p-3 rounded-2xl shadow-2xl grid grid-cols-1 md:grid-cols-4 gap-2 text-slate-800"
            >
              <div className="flex flex-col text-left px-4 py-2 bg-slate-50 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-600" /> Check-In
                </span>
                <input
                  type="date"
                  required
                  value={params.checkIn}
                  onChange={(e) => setParams({ ...params, checkIn: e.target.value })}
                  className="bg-transparent text-sm font-semibold outline-none mt-1 text-slate-900"
                />
              </div>

              <div className="flex flex-col text-left px-4 py-2 bg-slate-50 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-brand-600" /> Check-Out
                </span>
                <input
                  type="date"
                  required
                  value={params.checkOut}
                  onChange={(e) => setParams({ ...params, checkOut: e.target.value })}
                  className="bg-transparent text-sm font-semibold outline-none mt-1 text-slate-900"
                />
              </div>

              <div className="flex flex-col text-left px-4 py-2 bg-slate-50 rounded-xl">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-brand-600" /> Guests
                </span>
                <select
                  value={params.adults}
                  onChange={(e) => setParams({ ...params, adults: Number(e.target.value) })}
                  className="bg-transparent text-sm font-semibold outline-none mt-1 text-slate-900 cursor-pointer"
                >
                  <option value={1}>1 Adult</option>
                  <option value={2}>2 Adults</option>
                  <option value={3}>3 Adults</option>
                  <option value={4}>4+ Adults</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-navy-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all p-3 shadow-lg shadow-brand-500/20 cursor-pointer"
              >
                <Search className="w-5 h-5 stroke-[2.5]" />
                <span>Search</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-6">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Instant Booking</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Real-time room availability locks eliminate double-bookings instantly.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-6">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Secure Payments</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Bank-grade PCI-compliant transactions and encrypted guest data.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Luxury Suites</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Explore presidential suites, deluxe rooms, and premium amenities.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}