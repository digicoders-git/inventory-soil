import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';

const AllSites = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const { data } = await api.get('/sites');
      setSites(data.data);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const handleView = (site) => {
    navigate(`/admin/sites/${site._id}`);
  };

  const filteredSites = sites.filter(site => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['completed', 'cancelled', 'closed'].includes(site.status);
    return site.status === filter;
  });

  const columns = [
    { key: 'name', label: 'Site Name' },
    {
      key: 'userId',
      label: 'Supervisor',
      render: (val) => val?.name || 'Unassigned'
    },
    {
      key: 'adminId',
      label: 'Admin',
      render: (val) => val?.name || '-'
    },
    {
      key: 'estimatedCost',
      label: 'Estimated Cost',
      render: (value) => `₹${value?.toLocaleString() || 0}`
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />
    },
    {
      key: 'startDate',
      label: 'Start Date',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
  ];

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Sites</h1>
        <button
          onClick={() => navigate('/admin/create-site')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
        >
          Create New Site
        </button>
      </div>

      <div className="mb-6 flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'active', 'completed', 'closed', 'cancelled'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === f
              ? 'bg-slate-900 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-100 border'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <DataTable columns={columns} data={filteredSites} onView={handleView} />
      </div>
    </DashboardLayout>
  );
};

export default AllSites;
