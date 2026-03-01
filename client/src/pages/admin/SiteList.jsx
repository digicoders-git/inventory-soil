import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';

const SiteList = () => {
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [enrichedSites, setEnrichedSites] = useState([]);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const [sitesRes, installmentsRes, expensesRes] = await Promise.all([
        api.get('/sites'),
        api.get('/installments'),
        api.get('/expenses'),
      ]);

      const sitesData = sitesRes.data.data;
      const installments = installmentsRes.data.data;
      const expenses = expensesRes.data.data;

      const enriched = sitesData.map(site => {
        const siteInstallments = installments.filter(i => i.siteId?._id === site._id || i.siteId === site._id);
        const siteExpenses = expenses.filter(e => e.siteId?._id === site._id || e.siteId === site._id);
        
        const givenAmount = siteInstallments.reduce((sum, i) => sum + i.amount, 0);
        const expenseUsed = siteExpenses.reduce((sum, e) => sum + e.amount, 0);
        const remainingBalance = givenAmount - expenseUsed;

        return {
          ...site,
          givenAmount,
          expenseUsed,
          remainingBalance,
        };
      });

      setEnrichedSites(enriched);
      setSites(sitesData);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const handleView = (site) => {
    navigate(`/admin/sites/${site._id}`);
  };

  const columns = [
    { key: 'name', label: 'Site Name' },
    { 
      key: 'userId', 
      label: 'Supervisor',
      render: (val) => val?.name || '-'
    },
    { 
      key: 'estimatedCost', 
      label: 'Estimated Cost',
      render: (value) => `₹${value?.toLocaleString() || 0}`
    },
    { 
      key: 'givenAmount', 
      label: 'Given Amount',
      render: (value) => `₹${value?.toLocaleString() || 0}`
    },
    { 
      key: 'expenseUsed', 
      label: 'Expense Used',
      render: (value) => `₹${value?.toLocaleString() || 0}`
    },
    { 
      key: 'remainingBalance', 
      label: 'Remaining Balance',
      render: (value) => (
        <span className={value < 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
          ₹{value?.toLocaleString() || 0}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value) => <StatusBadge status={value} />
    },
  ];

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sites</h1>
        <button
          onClick={() => navigate('/admin/create-site')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Site
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <DataTable columns={columns} data={enrichedSites} onView={handleView} />
      </div>
    </DashboardLayout>
  );
};

export default SiteList;
