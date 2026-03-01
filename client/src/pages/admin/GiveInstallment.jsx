import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import FormInput from '../../components/FormInput';
import DataTable from '../../components/DataTable';
import api from '../../services/api';

const GiveInstallment = () => {
  const [sites, setSites] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [formData, setFormData] = useState({
    siteId: '',
    amount: '',
    note: '',
  });

  useEffect(() => {
    fetchSites();
    fetchInstallments();
  }, []);

  const fetchSites = async () => {
    try {
      const { data } = await api.get('/sites');
      setSites(data.data);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const fetchInstallments = async () => {
    try {
      const { data } = await api.get('/installments');
      setInstallments(data.data);
    } catch (error) {
      console.error('Error fetching installments:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/installments', { 
        ...formData,
        receivedBy: sites.find(s => s._id === formData.siteId)?.userId?._id || sites.find(s => s._id === formData.siteId)?.userId
      });
      setFormData({ siteId: '', amount: '', note: '' });
      fetchInstallments();
    } catch (error) {
      console.error('Error creating installment:', error);
    }
  };

  const columns = [
    { 
      key: 'siteId', 
      label: 'Site',
      render: (val) => val?.name || '-'
    },
    { 
      key: 'amount', 
      label: 'Amount',
      render: (val) => `₹${val.toLocaleString()}`
    },
    { key: 'note', label: 'Note' },
    { 
      key: 'date', 
      label: 'Date',
      render: (val) => new Date(val).toLocaleDateString()
    },
  ];

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Give Installment</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">New Installment</h2>
          <form onSubmit={handleSubmit}>
            <FormInput
              label="Select Site"
              type="select"
              name="siteId"
              value={formData.siteId}
              onChange={handleChange}
              options={sites.map(s => ({ value: s._id, label: s.name }))}
              required
            />
            <FormInput
              label="Amount"
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="Enter amount"
              required
            />
            <FormInput
              label="Note"
              type="textarea"
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="Additional notes"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Give Installment
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Installments</h2>
          <div className="overflow-y-auto max-h-96">
            {installments.slice(0, 5).map((inst, idx) => (
              <div key={idx} className="border-b py-3">
                <div className="flex justify-between">
                  <span className="font-medium">{inst.siteId?.name}</span>
                  <span className="text-green-600 font-semibold">₹{inst.amount.toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-600">{inst.note}</p>
                <p className="text-xs text-gray-400">{new Date(inst.date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">All Installments</h2>
        </div>
        <DataTable columns={columns} data={installments} />
      </div>
    </DashboardLayout>
  );
};

export default GiveInstallment;
