import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DashboardCard from '../../components/DashboardCard';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState({
    totalAdmins: 0,
    totalSupervisors: 0,
    totalSites: 0,
    activeSites: 0,
    totalMachines: 0,
    availableMachines: 0,
    totalExpenses: 0,
    totalFundDispatched: 0
  });
  const [recentSites, setRecentSites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersRes, sitesRes, expensesRes, machinesRes, fundsRes] = await Promise.all([
        api.get('/users'),
        api.get('/sites'),
        api.get('/expenses'),
        api.get('/machine-units'),
        api.get('/admin-funds'),
      ]);

      const users = usersRes.data.data;
      const sites = sitesRes.data.data;
      const expenses = expensesRes.data.data;
      const machines = machinesRes.data.data;
      const funds = fundsRes.data.data;

      const admins = users.filter(u => u.role === 'admin');
      const supervisors = users.filter(u => u.role === 'user');
      const activeSites = sites.filter(s => !['completed', 'cancelled', 'closed'].includes(s.status));
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const availableMachines = machines.filter(m => m.status === 'available');
      const totalFundDispatched = funds.reduce((sum, f) => sum + f.amount, 0);

      setStats({
        totalAdmins: admins.length,
        totalSupervisors: supervisors.length,
        totalSites: sites.length,
        activeSites: activeSites.length,
        totalMachines: machines.length,
        availableMachines: availableMachines.length,
        totalExpenses,
        totalFundDispatched
      });

      setRecentSites(sites.slice(0, 5));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-full text-lg font-bold">Loading Global Stats...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">SuperAdmin Dashboard</h1>
          <p className="text-gray-500 mt-1">Global overview of system performance and resources.</p>
        </div>
        <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-bold text-gray-700">System Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <DashboardCard
          title="Total Admins"
          value={stats.totalAdmins}
          color="purple"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
        <DashboardCard
          title="Total Supervisors"
          value={stats.totalSupervisors}
          color="indigo"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <DashboardCard
          title="Active Sites"
          value={`${stats.activeSites} / ${stats.totalSites}`}
          color="blue"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
        <DashboardCard
          title="Available Machines"
          value={`${stats.availableMachines} / ${stats.totalMachines}`}
          color="green"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-3xl p-8 text-white shadow-xl shadow-red-200">
          <h2 className="text-lg font-bold opacity-80 mb-2">Total System Expenses</h2>
          <p className="text-4xl font-extrabold mb-8">₹{stats.totalExpenses.toLocaleString()}</p>
          <div className="flex justify-between items-center bg-white/10 backdrop-blur-md rounded-2xl p-4">
            <div>
              <p className="text-xs opacity-70">Total Fund Dispatched</p>
              <p className="font-bold text-xl">₹{stats.totalFundDispatched.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-70">Utilization Rate</p>
              <p className="font-bold text-xl">{stats.totalFundDispatched > 0 ? ((stats.totalExpenses / stats.totalFundDispatched) * 100).toFixed(1) : 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col justify-between">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4 flex-1">
            <button
              onClick={() => window.location.href = '/superadmin/admins'}
              className="p-6 bg-purple-50 text-purple-600 rounded-2xl text-sm font-bold hover:bg-purple-100 transition-all active:scale-95 flex flex-col items-center justify-center space-y-2 border border-purple-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              <span>Manage Admins</span>
            </button>
            <button
              onClick={() => window.location.href = '/superadmin/funds'}
              className="p-6 bg-emerald-50 text-emerald-600 rounded-2xl text-sm font-bold hover:bg-emerald-100 transition-all active:scale-95 flex flex-col items-center justify-center space-y-2 border border-emerald-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Dispatch Funds</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Recent Sites Activity</h2>
          <button
            onClick={() => window.location.href = '/admin/sites'}
            className="text-sm font-bold text-indigo-600 hover:text-indigo-800"
          >
            View All Sites
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase">Site Name</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase">Supervisor</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase">Status</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-400 uppercase text-right">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentSites.map(site => (
                <tr key={site._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-4 font-semibold text-gray-900">{site.name}</td>
                  <td className="px-8 py-4 text-gray-600">{site.userId?.name || '-'}</td>
                  <td className="px-8 py-4"><StatusBadge status={site.status} /></td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end">
                      <div className="w-24 bg-gray-100 rounded-full h-1.5 mr-3">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                      <span className="text-sm font-bold text-gray-700">45%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
