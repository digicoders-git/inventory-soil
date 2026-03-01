import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import api from '../../services/api';

const MovementList = () => {
  const [movements, setMovements] = useState([]);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ machineUnitId: '', fromLocationType: 'store', toLocationType: 'site', toLocationId: '', notes: '' });
  const [machineUnits, setMachineUnits] = useState([]);
  const [sites, setSites] = useState([]);

  useEffect(() => {
    fetchMovements();
    fetchUnitsAndSites();
  }, []);

  const fetchMovements = async () => {
    try {
      const { data } = await api.get('/movements');
      setMovements(data.data);
    } catch (error) {
      console.error('Error fetching movements:', error);
    }
  };

  const fetchUnitsAndSites = async () => {
    try {
      const [unitsRes, sitesRes] = await Promise.all([
        api.get('/machine-units'),
        api.get('/sites')
      ]);
      setMachineUnits(unitsRes.data.data.filter(u => u.status === 'available' || u.status === 'assigned'));
      setSites(sitesRes.data.data.filter(s => ['created', 'machines_assigned', 'supervisor_assigned', 'active', 'in_progress'].includes(s.status)));
    } catch (error) {
      console.error('Error fetching units/sites', error);
    }
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      const unit = machineUnits.find(u => u._id === requestForm.machineUnitId);
      if (!unit) return alert('Invalid unit');

      const payload = {
        ...requestForm,
        fromLocationType: unit.currentSiteId ? 'site' : 'store',
        fromLocationId: unit.currentSiteId ? unit.currentSiteId._id : null
      };

      await api.post('/movements', payload);
      setIsRequestModalOpen(false);
      fetchMovements();
      alert('Movement requested successfully');
    } catch (error) {
      console.error('Error requesting movement:', error);
      alert(error.response?.data?.message || 'Error occurred');
    }
  };

  const handleApprove = async (movementId) => {
    if (window.confirm('Approve this movement?')) {
      try {
        await api.put(`/movements/${movementId}/approve`);
        fetchMovements();
      } catch (error) {
        console.error('Error approving:', error);
        alert(error.response?.data?.message || 'Error occurred');
      }
    }
  };

  const columns = [
    { key: 'machineUnitId', label: 'Machine', render: (val) => `${val?.machineTypeId?.name} - ${val?.serialNumber}` },
    { key: 'fromLocationType', label: 'From' },
    { key: 'toLocationType', label: 'To' },
    { key: 'toLocationId', label: 'To Site', render: (val) => val?.name || '-' },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    { key: 'movementDate', label: 'Moved On', render: (val) => val ? new Date(val).toLocaleDateString() : '-' },
    { key: 'notes', label: 'Notes' }
  ];

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Machine Movements</h1>
        <button
          onClick={() => setIsRequestModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Request Movement
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {column.label}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movements.map((item) => (
                <tr key={item._id}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {column.render ? column.render(item[column.key], item) : item[column.key]}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {item.status === 'pending' && (
                      <button onClick={() => handleApprove(item._id)} className="text-green-600 hover:text-green-900 font-semibold">
                        Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Request Movement">
        <form onSubmit={handleRequestSubmit}>
          <FormInput
            label="Machine Unit"
            type="select"
            name="machineUnitId"
            value={requestForm.machineUnitId}
            onChange={(e) => setRequestForm({ ...requestForm, machineUnitId: e.target.value })}
            options={machineUnits.map(u => ({ value: u._id, label: `${u.machineTypeId?.name} (${u.serialNumber}) - ${u.status}` }))}
            required
          />
          <FormInput
            label="Transfer To"
            type="select"
            name="toLocationType"
            value={requestForm.toLocationType}
            onChange={(e) => setRequestForm({ ...requestForm, toLocationType: e.target.value })}
            options={[{ value: 'site', label: 'Site' }, { value: 'store', label: 'Store' }, { value: 'repair', label: 'Repair' }]}
            required
          />
          {requestForm.toLocationType === 'site' && (
            <FormInput
              label="Select Site"
              type="select"
              name="toLocationId"
              value={requestForm.toLocationId}
              onChange={(e) => setRequestForm({ ...requestForm, toLocationId: e.target.value })}
              options={sites.map(s => ({ value: s._id, label: s.name }))}
              required
            />
          )}
          <FormInput label="Notes" name="notes" value={requestForm.notes} onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })} />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg mt-4">Submit Request</button>
        </form>
      </Modal>
    </DashboardLayout>
  );
};

export default MovementList;
