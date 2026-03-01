import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Tabs from '../../components/Tabs';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import EmptyState from '../../components/EmptyState';
import api from '../../services/api';

const SiteDetails = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [site, setSite] = useState(null);
  const [machines, setMachines] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [reports, setReports] = useState([]);
  const [dailyUpdates, setDailyUpdates] = useState([]);
  const [availableMachines, setAvailableMachines] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [activeSites, setActiveSites] = useState([]);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromSiteMachineId: '', toSiteId: '', quantityToTransfer: '' });

  const [selectedSupervisor, setSelectedSupervisor] = useState('');

  const [assignForm, setAssignForm] = useState({ unitIds: [] });
  const [installmentForm, setInstallmentForm] = useState({ amount: '', note: '' });

  useEffect(() => {
    fetchSiteDetails();
    fetchAvailableMachines();
    fetchSupervisors();
    fetchActiveSites();
  }, [id]);

  const fetchActiveSites = async () => {
    try {
      const { data } = await api.get('/sites');
      // filter active sites and exclude current site
      setActiveSites(data.data.filter(s => ['created', 'machines_assigned', 'supervisor_assigned', 'active', 'in_progress'].includes(s.status) && s._id !== id));
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const fetchSiteDetails = async () => {
    try {
      const [siteRes, machinesRes, installmentsRes, expensesRes, reportsRes, updatesRes, settlementsRes] = await Promise.all([
        api.get(`/sites/${id}`),
        api.get(`/machine-units/site/${id}`),
        api.get(`/installments?siteId=${id}`),
        api.get(`/expenses?siteId=${id}`),
        api.get(`/reports?siteId=${id}`),
        api.get(`/daily-updates?siteId=${id}`),
        api.get(`/site-settlements?siteId=${id}`)
      ]);

      setSite(siteRes.data.data);
      setMachines(machinesRes.data.data || []);
      setInstallments(installmentsRes.data.data || []);
      setExpenses(expensesRes.data.data || []);
      setReports(reportsRes.data.data || []);
      setDailyUpdates(updatesRes.data.data || []);
      setSettlements(settlementsRes.data.data || []);
    } catch (error) {
      console.error('Error fetching site details:', error);
    }
  };

  const fetchAvailableMachines = async () => {
    try {
      const { data } = await api.get('/machine-units/available');
      setAvailableMachines(data.data);
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const fetchSupervisors = async () => {
    try {
      const { data } = await api.get('/users');
      const userList = data.data.filter(u => u.role === 'user');
      setSupervisors(userList);
    } catch (error) {
      console.error('Error fetching supervisors:', error);
    }
  };

  const handleAssignMachine = async (e) => {
    e.preventDefault();
    try {
      if (assignForm.unitIds.length === 0) return alert('Select at least one unit');

      // Request movements for all selected units
      await Promise.all(assignForm.unitIds.map(unitId =>
        api.post('/movements', {
          machineUnitId: unitId,
          fromLocationType: 'store',
          toLocationType: 'site',
          toLocationId: id,
          notes: 'Assigned by admin'
        }).then(res => api.put(`/movements/${res.data.data._id}/approve`)) // Auto approve for admin
      ));

      setIsAssignModalOpen(false);
      setAssignForm({ unitIds: [] });
      fetchSiteDetails();
      fetchAvailableMachines();
      alert('Machines assigned successfully!');
    } catch (error) {
      console.error('Error assigning machine:', error);
      alert(error.response?.data?.message || 'Error occurred');
    }
  };

  const handleAssignSupervisor = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/sites/${id}`, { userId: selectedSupervisor });
      setIsSupervisorModalOpen(false);
      fetchSiteDetails();
      alert('Supervisor assigned successfully.');
    } catch (error) {
      console.error('Error assigning supervisor:', error);
    }
  };

  const handleReturnMachine = async (machineUnit) => {
    if (window.confirm('Mark this machine as returned to store?')) {
      try {
        const res = await api.post('/movements', {
          machineUnitId: machineUnit._id,
          fromLocationType: 'site',
          fromLocationId: id,
          toLocationType: 'store',
          notes: 'Returned from site'
        });
        await api.put(`/movements/${res.data.data._id}/approve`);

        fetchSiteDetails();
        fetchAvailableMachines();
        alert('Machine returned successfully');
      } catch (error) {
        console.error('Error returning machine:', error);
      }
    }
  };

  const handleTransferMachine = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/movements', {
        machineUnitId: transferForm.fromSiteMachineId, // here fromSiteMachineId acts as unitId
        fromLocationType: 'site',
        fromLocationId: id,
        toLocationType: 'site',
        toLocationId: transferForm.toSiteId,
        notes: 'Transfer to another site'
      });
      await api.put(`/movements/${res.data.data._id}/approve`);

      setIsTransferModalOpen(false);
      setTransferForm({ fromSiteMachineId: '', toSiteId: '', quantityToTransfer: '' });
      fetchSiteDetails();
      alert('Machine transferred successfully!');
    } catch (error) {
      console.error('Error transferring machine:', error);
      alert(error.response?.data?.message || 'Failed to transfer machine');
    }
  };

  const handleAddInstallment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/installments', {
        ...installmentForm,
        siteId: id,
        receivedBy: site.userId?._id || site.userId
      });
      setIsInstallmentModalOpen(false);
      setInstallmentForm({ amount: '', note: '' });
      fetchSiteDetails();
    } catch (error) {
      console.error('Error adding installment:', error);
    }
  };

  const handleApproveRepair = async (report) => {
    if (window.confirm('Approve repair and the estimated cost for this machine?')) {
      try {
        await api.put(`/reports/${report._id}`, { status: 'approved' });
        fetchSiteDetails();
      } catch (error) {
        console.error('Error approving repair:', error);
      }
    }
  };

  const handleRejectRepair = async (report) => {
    if (window.confirm('Reject this repair request?')) {
      try {
        await api.put(`/reports/${report._id}`, { status: 'rejected' });
        fetchSiteDetails();
      } catch (error) {
        console.error('Error rejecting repair:', error);
      }
    }
  };

  const handleMarkFixed = async (report) => {
    if (window.confirm('Mark this machine as fixed?')) {
      try {
        await api.put(`/reports/${report._id}`, { status: 'fixed' });
        fetchSiteDetails();
      } catch (error) {
        console.error('Error marking as fixed:', error);
      }
    }
  };

  const handleMarkCompleted = async () => {
    if (window.confirm('Are you sure the site work is finished?')) {
      try {
        await api.put(`/sites/${id}`, { status: 'completed', endDate: new Date() });
        fetchSiteDetails();
        alert('Site marked as completed.');
      } catch (error) {
        console.error('Error completing site:', error);
      }
    }
  };

  const handleApproveSettlement = async (settlementId) => {
    if (window.confirm('Approve this settlement? Machines will be officially returned/damaged and refund recorded.')) {
      try {
        await api.put(`/site-settlements/${settlementId}`, { status: 'approved' });
        fetchSiteDetails();
        fetchAvailableMachines();
        alert('Settlement approved successfully.');
      } catch (error) {
        console.error('Error approving settlement:', error);
        alert('Failed to approve settlement');
      }
    }
  };

  const handleRejectSettlement = async (settlementId) => {
    if (window.confirm('Reject this settlement? User will have to submit it again.')) {
      try {
        await api.put(`/site-settlements/${settlementId}`, { status: 'rejected' });
        fetchSiteDetails();
        alert('Settlement rejected.');
      } catch (error) {
        console.error('Error rejecting settlement:', error);
      }
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'updates', label: 'Daily Work' },
    { id: 'machines', label: 'Machines Assigned' },
    { id: 'installments', label: 'Installments' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'reports', label: 'Machine Reports' },
    { id: 'settlements', label: 'Settlements' },
  ];

  const machineColumns = [
    { key: 'serialNumber', label: 'Serial No.' },
    { key: 'machineTypeId', label: 'Machine Type', render: (val) => val?.name || '-' },
    { key: 'condition', label: 'Condition' },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
  ];

  const installmentColumns = [
    { key: 'amount', label: 'Amount', render: (val) => `₹${val.toLocaleString()}` },
    { key: 'date', label: 'Date', render: (val) => new Date(val).toLocaleDateString() },
    { key: 'note', label: 'Note' },
  ];

  const expenseColumns = [
    { key: 'amount', label: 'Amount', render: (val) => `₹${val.toLocaleString()}` },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    { key: 'date', label: 'Date', render: (val) => new Date(val).toLocaleDateString() },
  ];

  const reportColumns = [
    { key: 'machineUnitId', label: 'Machine', render: (val) => val ? `${val.machineTypeId?.name} (SN: ${val.serialNumber})` : '-' },
    { key: 'issue', label: 'Issue' },
    { key: 'estimatedCost', label: 'Est. Cost', render: (val) => val ? `₹${val.toLocaleString()}` : '-' },
    { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
    { key: 'repairCost', label: 'Final Cost', render: (val) => val ? `₹${val.toLocaleString()}` : '-' },
  ];

  const updateColumns = [
    { key: 'date', label: 'Date', render: (val) => new Date(val).toLocaleDateString() },
    { key: 'workDescription', label: 'Work Description' },
    { key: 'progress', label: 'Progress (%)', render: (val) => `${val}%` },
    { key: 'notes', label: 'Notes' },
  ];

  if (!site) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

  const totalGiven = installments.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSettlementReturn = settlements.filter(s => s.status === 'approved').reduce((sum, s) => sum + (s.returnAmount || 0), 0);
  const balance = totalGiven - totalExpense - totalSettlementReturn;
  const totalProgress = dailyUpdates.reduce((sum, update) => sum + (Number(update.progress) || 0), 0);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{site.name}</h1>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600">Address</p>
              <p className="font-medium">{site.address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Supervisor</p>
              {site.userId ? (
                <p className="font-medium">{site.userId.name}</p>
              ) : (
                <div>
                  <p className="font-medium text-red-500 mb-1">Not Assigned</p>
                  <button
                    onClick={() => setIsSupervisorModalOpen(true)}
                    className="px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-lg hover:bg-yellow-600"
                  >
                    Assign Supervisor
                  </button>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <StatusBadge status={site.status} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="font-medium">{new Date(site.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Work Progress</p>
              <div className="flex items-center mt-1">
                <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min(totalProgress, 100)}%` }}></div>
                </div>
                <span className="text-sm font-medium">{totalProgress}%</span>
              </div>
            </div>
            {['created', 'machines_assigned', 'supervisor_assigned', 'active', 'in_progress'].includes(site.status) && (
              <div>
                <p className="text-sm text-gray-600">Action</p>
                <button
                  onClick={handleMarkCompleted}
                  className="mt-1 px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-sm"
                >
                  Mark as Completed
                </button>
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Cost Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Estimated Cost</p>
                <p className="text-xl font-bold text-blue-600">₹{site.estimatedCost?.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Given</p>
                <p className="text-xl font-bold text-green-600">₹{totalGiven.toLocaleString()}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Work Expense</p>
                <p className="text-xl font-bold text-red-600">₹{totalExpense.toLocaleString()}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Returned in Settlement</p>
                <p className="text-xl font-bold text-indigo-600">₹{totalSettlementReturn.toLocaleString()}</p>
              </div>
              <div className={`${balance >= 0 ? 'bg-green-50' : 'bg-red-50'} p-4 rounded-lg`}>
                <p className="text-sm text-gray-600">Current Balance</p>
                <p className={`text-xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{balance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {site.notes && (
            <div className="border-t pt-6 mt-6">
              <p className="text-sm text-gray-600">Notes</p>
              <p className="font-medium">{site.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'updates' && (
        <div className="bg-white rounded-lg shadow">
          {dailyUpdates.length > 0 ? (
            <DataTable columns={updateColumns} data={dailyUpdates} />
          ) : (
            <EmptyState message="No daily work updates recorded yet" />
          )}
        </div>
      )}

      {activeTab === 'machines' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Assign Machine
            </button>
          </div>
          <div className="bg-white rounded-lg shadow">
            {machines.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {machineColumns.map(col => (
                        <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{col.label}</th>
                      ))}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {machines.map((machine) => (
                      <tr key={machine._id}>
                        {machineColumns.map(col => (
                          <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm">
                            {col.render ? col.render(machine[col.key], machine) : machine[col.key]}
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {machine.status === 'assigned' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleReturnMachine(machine)}
                                className="text-green-600 hover:text-green-900 font-semibold"
                              >
                                Return
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => {
                                  setTransferForm({ ...transferForm, fromSiteMachineId: machine._id, quantityToTransfer: machine.quantity });
                                  setIsTransferModalOpen(true);
                                }}
                                className="text-purple-600 hover:text-purple-900 font-semibold"
                              >
                                Transfer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No machines currently assigned" />
            )}
          </div>

          {settlements.some(s => s.status === 'approved' && s.returnedMachines && s.returnedMachines.length > 0) && (
            <div className="mt-6 bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold mb-4 text-gray-700">Returned Machines (History)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition Returned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {settlements.filter(s => s.status === 'approved').flatMap(s => s.returnedMachines || []).map(m => (
                      <tr key={m._id} className="hover:bg-gray-50 text-sm">
                        <td className="px-6 py-4">{m.serialNumber}</td>
                        <td className="px-6 py-4">{m.machineTypeId?.name || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold
                            ${m.condition === 'good' ? 'bg-green-100 text-green-800' :
                              m.condition === 'damaged' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {m.condition}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'installments' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setIsInstallmentModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Installment
            </button>
          </div>
          <div className="bg-white rounded-lg shadow">
            {installments.length > 0 ? (
              <DataTable columns={installmentColumns} data={installments} />
            ) : (
              <EmptyState message="No installments given" />
            )}
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="bg-white rounded-lg shadow">
          {expenses.length > 0 ? (
            <>
              <div className="p-4 border-b bg-gray-50">
                <p className="text-lg font-semibold">Total Expenses: ₹{totalExpense.toLocaleString()}</p>
              </div>
              <DataTable columns={expenseColumns} data={expenses} />
            </>
          ) : (
            <EmptyState message="No expenses recorded" />
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="bg-white rounded-lg shadow">
          {reports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {reportColumns.map(col => (
                      <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{col.label}</th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report._id}>
                      {reportColumns.map(col => (
                        <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm">
                          {col.render ? col.render(report[col.key], report) : report[col.key]}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          {report.status === 'reported' && (
                            <>
                              <button
                                onClick={() => handleApproveRepair(report)}
                                className="text-blue-600 hover:text-blue-900 font-semibold"
                              >
                                Approve
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => handleRejectRepair(report)}
                                className="text-red-600 hover:text-red-900 font-semibold"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {report.status === 'approved' && (
                            <span className="text-gray-500 italic">Waiting for User</span>
                          )}
                          {(report.status === 'fixed' || report.status === 'dead' || report.status === 'rejected') && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No machine reports" />
          )}
        </div>
      )}

      {activeTab === 'settlements' && (
        <div className="bg-white rounded-lg shadow">
          {settlements.length > 0 ? (
            <div className="p-6 space-y-6">
              {settlements.map((settlement) => (
                <div key={settlement._id} className="border rounded-lg p-6 bg-gray-50 relative">
                  <div className="absolute top-4 right-4">
                    <StatusBadge status={settlement.status} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Settlement Request</h3>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium text-gray-800">Submitted By:</span> {settlement.userId?.name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium text-gray-800">Return Amount:</span> ₹{settlement.returnAmount}
                  </p>
                  <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">
                    <span className="font-medium text-gray-800">Notes:</span><br />{settlement.notes || 'None'}
                  </p>

                  <h4 className="font-medium text-md mb-2">Machine Conditions Reported:</h4>
                  {settlement.returnedMachines && settlement.returnedMachines.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 mb-4">
                      {settlement.returnedMachines.map((m) => {
                        return (
                          <li key={m._id} className="text-sm">
                            <span className="font-medium">{m.machineTypeId?.name} (SN: {m.serialNumber}):</span> {m.condition}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 mb-4">No specific machine conditions reported.</p>
                  )}

                  {settlement.status === 'pending' && (
                    <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleApproveSettlement(settlement._id)}
                        className="px-6 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700"
                      >
                        Approve & Process Returns
                      </button>
                      <button
                        onClick={() => handleRejectSettlement(settlement._id)}
                        className="px-6 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {settlement.status === 'approved' && (
                    <p className="mt-4 pt-4 border-t border-gray-200 text-sm text-green-700 font-semibold">
                      This settlement has been approved and all returns/refunds have been processed.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No settlements requested yet." />
          )}
        </div>
      )}

      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Machine Units">
        <form onSubmit={handleAssignMachine}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Units to Assign</label>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar border border-gray-200 rounded-lg p-3 bg-gray-50">
              {availableMachines.length > 0 ? availableMachines.map(m => (
                <label key={m._id} className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${assignForm.unitIds.includes(m._id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <div className="flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                      checked={assignForm.unitIds.includes(m._id)}
                      onChange={(e) => {
                        const newSelection = e.target.checked
                          ? [...assignForm.unitIds, m._id]
                          : assignForm.unitIds.filter(id => id !== m._id);
                        setAssignForm({ ...assignForm, unitIds: newSelection });
                      }}
                    />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm font-medium ${assignForm.unitIds.includes(m._id) ? 'text-indigo-900' : 'text-gray-900'}`}>{m.machineTypeId?.name}</p>
                    <p className={`text-xs ${assignForm.unitIds.includes(m._id) ? 'text-indigo-700' : 'text-gray-500'}`}>
                      Serial: <span className="font-mono">{m.serialNumber}</span> • Cond: <span className="capitalize">{m.condition}</span>
                    </p>
                  </div>
                </label>
              )) : (
                <p className="text-sm text-gray-500 text-center py-4">No available machines to assign.</p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right">{assignForm.unitIds.length} item(s) selected</p>
          </div>
          <button type="submit" disabled={assignForm.unitIds.length === 0} className={`w-full py-2.5 rounded-lg transition-colors font-medium text-white shadow-sm ${assignForm.unitIds.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            Confirm Assignment
          </button>
        </form>
      </Modal>

      <Modal isOpen={isSupervisorModalOpen} onClose={() => setIsSupervisorModalOpen(false)} title="Assign Supervisor">
        <form onSubmit={handleAssignSupervisor}>
          <FormInput
            label="Select Supervisor"
            type="select"
            name="userId"
            value={selectedSupervisor}
            onChange={(e) => setSelectedSupervisor(e.target.value)}
            options={supervisors.map(s => ({ value: s._id, label: s.name }))}
            required
          />
          <button type="submit" className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 mt-4">
            Assign Supervisor
          </button>
        </form>
      </Modal>

      <Modal isOpen={isInstallmentModalOpen} onClose={() => setIsInstallmentModalOpen(false)} title="Add Installment">
        <form onSubmit={handleAddInstallment}>
          <FormInput
            label="Amount"
            type="number"
            name="amount"
            value={installmentForm.amount}
            onChange={(e) => setInstallmentForm({ ...installmentForm, amount: e.target.value })}
            required
          />
          <FormInput
            label="Note"
            type="textarea"
            name="note"
            value={installmentForm.note}
            onChange={(e) => setInstallmentForm({ ...installmentForm, note: e.target.value })}
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
            Add Installment
          </button>
        </form>
      </Modal>

      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Transfer Machine to Another Site">
        <form onSubmit={handleTransferMachine}>
          <div className="mb-4">
            <p className="text-sm text-gray-600">Select the target site where this machine will be transferred to.</p>
          </div>
          <FormInput
            label="Target Site"
            type="select"
            name="toSiteId"
            value={transferForm.toSiteId}
            onChange={(e) => setTransferForm({ ...transferForm, toSiteId: e.target.value })}
            options={activeSites.map(s => ({ value: s._id, label: s.name }))}
            required
          />
          <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 mt-2">
            Confirm Transfer
          </button>
        </form>
      </Modal>

    </DashboardLayout>
  );
};

export default SiteDetails;
