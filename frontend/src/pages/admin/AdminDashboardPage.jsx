import { useState, useEffect } from 'react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalBookings: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    // Fetch dashboard stats
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard Quản Lý</h1>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-gray-600 text-sm font-semibold mb-2">Tổng sự kiện</h3>
          <p className="text-3xl font-bold">{stats.totalEvents}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-gray-600 text-sm font-semibold mb-2">Tổng đặt vé</h3>
          <p className="text-3xl font-bold">{stats.totalBookings}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-gray-600 text-sm font-semibold mb-2">Doanh thu</h3>
          <p className="text-3xl font-bold text-primary">
            {stats.totalRevenue.toLocaleString()}đ
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="font-bold mb-4">Hoạt động gần đây</h2>
        <p className="text-gray-500">Đang tải...</p>
      </div>
    </div>
  );
}
