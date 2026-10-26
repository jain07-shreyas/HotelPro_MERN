import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import axiosClient from '../../api/axiosClient';
import { ErrorNote, Spinner, StatCard } from './ui';
import { apiError, label, money } from '../../utils/format';

const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
const AXIS = { stroke: '#94a3b8', tick: { fontSize: 12, fill: '#94a3b8' } };

const Card = ({ title, children }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5">
    <h3 className="font-bold text-sm mb-4">{title}</h3>
    <div className="h-64">{children}</div>
  </div>
);

export default function ReportsTab() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axiosClient.get('/admin/reports').then(({ data: res }) => setData(res.data)).catch((err) => setError(apiError(err)));
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Spinner />;
  const { totals, monthlyRevenue, occupancy, bookingsByStatus, revenueByCategory } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total revenue" value={money(totals.revenue)} hint="Paid, after refunds" />
        <StatCard title="Bookings" value={totals.bookings} />
        <StatCard title="In-house guests" value={totals.inHouseGuests} />
        <StatCard title="Occupancy today" value={`${totals.occupancyToday}%`} hint={`${totals.sellableRooms} sellable rooms`} />
        <StatCard title="Cancellation rate" value={`${totals.cancellationRate}%`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Revenue per month">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="month" {...AXIS} />
              <YAxis {...AXIS} />
              <Tooltip formatter={(v) => money(v)} />
              <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Occupancy, next 14 days (%)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={occupancy}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="date" {...AXIS} />
              <YAxis domain={[0, 100]} {...AXIS} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="percent" name="Occupancy" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Bookings by status">
          {bookingsByStatus.length === 0 ? (
            <p className="text-sm text-slate-500 text-center pt-20">No bookings yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bookingsByStatus.map((b) => ({ ...b, name: label(b.status) }))} dataKey="count" nameKey="name" outerRadius={85} label>
                  {bookingsByStatus.map((b, i) => <Cell key={b.status} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Revenue by room category">
          {revenueByCategory.length === 0 ? (
            <p className="text-sm text-slate-500 text-center pt-20">No paid bookings yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByCategory} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis type="number" {...AXIS} />
                <YAxis type="category" dataKey="category" width={120} {...AXIS} />
                <Tooltip formatter={(v) => money(v)} />
                <Bar dataKey="revenue" name="Revenue" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
