import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import Tabs from '../../components/Tabs';
import FormInput from '../../components/FormInput';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import api from '../../services/api';

const SiteWork = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [site, setSite] = useState(null);
  const [machines, setMachines] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [dailyUpdates, setDailyUpdates] = useState([]);
  const [reports, setReports] = useState([]);
  const [settlement, setSettlement] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPurchaseFormOpen, setIsPurchaseFormOpen] = useState(false);
  const [repairModal, setRepairModal] = useState({ isOpen: false, reportId: '', cost: '' });

  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: '',
    description: '',
  });

  const [machineTypes, setMachineTypes] = useState([]);

  const [purchaseForm, setPurchaseForm] = useState({
    machineTypeId: '',
    serialNumber: '',
    cost: '',
    description: '',
  });

  const [updateForm, setUpdateForm] = useState({
    workDescription: '',
    progress: '',
    notes: '',
  });

  const [reportForm, setReportForm] = useState({
    machineId: '',
    issue: '',
    estimatedCost: '',
    quantity: 1,
  });

  const [settlementForm, setSettlementForm] = useState({
    returnAmount: '',
    notes: '',
  });

  const [machineConditions, setMachineConditions] = useState({});

  useEffect(() => {
    fetchSiteData();
  }, [id]);

  const fetchSiteData = async () => {
    try {
      const [siteRes, machinesRes, expensesRes, installmentsRes, updatesRes, reportsRes, typeRes, settlementRes] = await Promise.all([
        api.get(`/sites/${id}`),
        api.get(`/machine-units/site/${id}`),
        api.get(`/expenses?siteId=${id}`),
        api.get(`/installments?siteId=${id}`),
        api.get(`/daily-updates?siteId=${id}`),
        api.get(`/reports?siteId=${id}`),
        api.get(`/machine-types`),
        api.get(`/site-settlements?siteId=${id}`),
      ]);

      setSite(siteRes.data.data);
      setMachines(machinesRes.data.data || []);
      setExpenses(expensesRes.data.data || []);
      setInstallments(installmentsRes.data.data || []);
      setDailyUpdates(updatesRes.data.data || []);
      setReports(reportsRes.data.data || []);
      setMachineTypes(typeRes.data.data || []);
      setSettlement(settlementRes.data.data?.[0] || null);

      const conditions = {};
      machinesRes.data.data.forEach(m => {
        conditions[m._id] = 'good';
      });
      setMachineConditions(conditions);
    } catch (error) {
      console.error('Error fetching site data:', error);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses', { ...expenseForm, siteId: id });
      setExpenseForm({ amount: '', category: '', description: '' });
      fetchSiteData();
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/daily-updates', { ...updateForm, siteId: id });
      setUpdateForm({ workDescription: '', progress: '', notes: '' });
      fetchSiteData();
    } catch (error) {
      console.error('Error submitting daily update:', error);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reports', {
        siteId: id,
        machineUnitId: reportForm.machineId,
        issue: reportForm.issue,
        estimatedCost: reportForm.estimatedCost,
      });
      setReportForm({ machineId: '', issue: '', estimatedCost: '' });
      alert('Machine issue reported. It is now marked for repair.');
      fetchSiteData();
    } catch (error) {
      console.error('Error reporting issue:', error);
    }
  };

  const handleReturnMachine = async (machineUnit) => {
    if (window.confirm('Mark this machine as returned to store?')) {
      try {
        await api.post('/movements', {
          machineUnitId: machineUnit._id,
          fromLocationType: 'site',
          fromLocationId: id,
          toLocationType: 'store',
          notes: 'Returned by supervisor'
        });
        alert('Movement request sent to admin for approval.');
        fetchSiteData();
      } catch (error) {
        console.error('Error returning machine:', error);
      }
    }
  };

  const handleMarkCompleted = async () => {
    if (window.confirm('Mark this site as completed?')) {
      try {
        await api.put(`/sites/${id}`, { status: 'completed' });
        fetchSiteData();
      } catch (error) {
        console.error('Error marking site as completed:', error);
      }
    }
  };

  const handleFinalSubmit = async () => {
    try {
      await api.post('/site-settlements', {
        siteId: id,
        returnAmount: settlementForm.returnAmount,
        notes: settlementForm.notes,
        machineConditions,
      });
      setIsConfirmModalOpen(false);
      alert('Settlement submitted for admin approval');
      fetchSiteData();
    } catch (error) {
      console.error('Error submitting settlement:', error);
    }
  };

  const handlePurchaseMachine = async (e) => {
    e.preventDefault();
    try {
      await api.post('/machine-units/purchase', {
        ...purchaseForm,
        siteId: id,
      });
      setIsPurchaseFormOpen(false);
      setPurchaseForm({ machineTypeId: '', serialNumber: '', cost: '', description: '' });
      alert('Machine purchased and assigned successfully!');
      fetchSiteData();
    } catch (error) {
      console.error('Error purchasing machine:', error);
      alert(error.response?.data?.message || 'Failed to purchase machine');
    }
  };

  const handleMarkDead = async (reportId) => {
    if (window.confirm('Mark this machine as completely dead/scrapped? It will be removed from circulation.')) {
      try {
        await api.put(`/reports/${reportId}`, { status: 'dead' });
        fetchSiteData();
      } catch (error) {
        console.error('Error marking machine dead:', error);
      }
    }
  };

  const submitRepair = async () => {
    if (!repairModal.cost || isNaN(repairModal.cost)) {
      alert('Please enter a valid repair cost');
      return;
    }
    try {
      // 1. Mark report as fixed
      await api.put(`/reports/${repairModal.reportId}`, {
        status: 'fixed',
        repairCost: Number(repairModal.cost)
      });
      // 2. Add expense for repair
      await api.post('/expenses', {
        siteId: id,
        amount: Number(repairModal.cost),
        category: 'repair',
        description: 'Machine Repair log generated'
      });

      setRepairModal({ isOpen: false, reportId: '', cost: '' });
      alert('Machine marked as repaired and expense added successfully!');
      fetchSiteData();
    } catch (error) {
      console.error('Error repairing machine:', error);
      alert('Failed to update repair status.');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'updates', label: 'Daily Work' },
    { id: 'expense', label: 'Daily Expense' },
    { id: 'machines', label: 'Machines' },
    { id: 'report', label: 'Report Issue' },
    { id: 'settlement', label: 'Settlement' },
  ];

  const expenseColumns = [
    { key: 'amount', label: 'Amount', render: (val) => `₹${val.toLocaleString()}` },
    { key: 'category', label: 'Category' },
    { key: 'description', label: 'Description' },
    { key: 'date', label: 'Date', render: (val) => new Date(val).toLocaleDateString() },
  ];

  const updateColumns = [
    { key: 'date', label: 'Date', render: (val) => new Date(val).toLocaleDateString() },
    { key: 'workDescription', label: 'Work Done' },
    { key: 'progress', label: 'Progress (%)', render: (val) => `${val}%` },
    { key: 'notes', label: 'Notes' },
  ];

  if (!site) return <DashboardLayout><div>Loading...</div></DashboardLayout>;

  const totalGiven = installments.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSettlementReturn = settlement && settlement.status === 'approved' ? (settlement.returnAmount || 0) : 0;
  const balance = totalGiven - totalExpense - totalSettlementReturn;
  const totalProgress = dailyUpdates.reduce((sum, update) => sum + (Number(update.progress) || 0), 0);

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
        {!['completed', 'cancelled', 'closed'].includes(site.status) && (
          totalProgress >= 90 ? (
            <button
              onClick={handleMarkCompleted}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow"
            >
              Mark as Completed
            </button>
          ) : (
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
              Reach 90% progress to complete
            </span>
          )
        )}
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600">Address</p>
              <p className="font-medium">{site.address}</p>
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
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Budget Summary</h3>
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
                <p className="text-sm text-gray-600">Returned to Admin</p>
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
        </div>
      )}

      {activeTab === 'updates' && (
        <div>
          {!['completed', 'cancelled', 'closed'].includes(site.status) && (
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Submit Daily Work Update</h2>
              <form onSubmit={handleUpdateSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormInput
                    label="Work Description"
                    type="textarea"
                    name="workDescription"
                    value={updateForm.workDescription}
                    onChange={(e) => setUpdateForm({ ...updateForm, workDescription: e.target.value })}
                    required
                  />
                  <FormInput
                    label="Progress (%)"
                    type="number"
                    name="progress"
                    value={updateForm.progress}
                    onChange={(e) => setUpdateForm({ ...updateForm, progress: e.target.value })}
                    required
                  />
                  <FormInput
                    label="Additional Notes"
                    type="textarea"
                    name="notes"
                    value={updateForm.notes}
                    onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Submit Update
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold">Work History</h2>
            </div>
            <DataTable columns={updateColumns} data={dailyUpdates} />
          </div>
        </div>
      )}

      {activeTab === 'expense' && (
        <div>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Add Daily Expense</h2>
            <form onSubmit={handleExpenseSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormInput
                  label="Amount"
                  type="number"
                  name="amount"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                />
                <FormInput
                  label="Category"
                  type="select"
                  name="category"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  options={[
                    { value: 'labour', label: 'Labour' },
                    { value: 'transport', label: 'Transport' },
                    { value: 'food', label: 'Food' },
                    { value: 'repair', label: 'Repair' },
                    { value: 'other', label: 'Other' },
                  ]}
                  required
                />
                <FormInput
                  label="Description"
                  name="description"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  required
                />
              </div>
              <button
                type="submit"
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Expense
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold">Expense History</h2>
              <p className="text-sm text-gray-600">Total: ₹{totalExpense.toLocaleString()}</p>
            </div>
            <DataTable columns={expenseColumns} data={expenses} />
          </div>
        </div>
      )}

      {activeTab === 'machines' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Assigned Machines</h2>
            {!['completed', 'cancelled', 'closed'].includes(site.status) && (
              <button
                onClick={() => setIsPurchaseFormOpen(!isPurchaseFormOpen)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
              >
                {isPurchaseFormOpen ? 'Cancel Purchase' : 'Purchase New Machine'}
              </button>
            )}
          </div>

          {isPurchaseFormOpen && !['completed', 'cancelled', 'closed'].includes(site.status) && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-3">Buy New Machine Locally</h3>
              <form onSubmit={handlePurchaseMachine}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormInput
                    label="Machine Type"
                    type="select"
                    name="machineTypeId"
                    value={purchaseForm.machineTypeId}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, machineTypeId: e.target.value })}
                    options={[
                      { value: '', label: 'Select Machine Type' },
                      ...machineTypes.map(t => ({ value: t._id, label: t.name }))
                    ]}
                    required
                  />
                  <FormInput
                    label="Serial Number (Unique)"
                    name="serialNumber"
                    value={purchaseForm.serialNumber}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, serialNumber: e.target.value })}
                    required
                  />
                  <FormInput
                    label="Purchase Cost (₹)"
                    type="number"
                    name="cost"
                    value={purchaseForm.cost}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, cost: e.target.value })}
                    required
                  />
                  <FormInput
                    label="Description/Notes"
                    name="description"
                    value={purchaseForm.description}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, description: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow"
                >
                  Submit Purchase & Add Expense
                </button>
              </form>
            </div>
          )}

          <div className="space-y-3">
            {machines.filter(m => m.status === 'assigned').map((machine) => (
              <div key={machine._id} className="flex justify-between items-center border rounded-lg p-4">
                <div>
                  <p className="font-medium">{machine.machineTypeId?.name} - {machine.serialNumber}</p>
                  <p className="text-sm text-gray-600">Condition: {machine.condition}</p>
                  <StatusBadge status={machine.status} />
                </div>
                <button
                  onClick={() => handleReturnMachine(machine)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Mark Returned
                </button>
              </div>
            ))}
            {machines.length === 0 && !isPurchaseFormOpen && (
              <p className="text-gray-500 text-sm">No machines currently assigned.</p>
            )}
          </div>

          {settlement && settlement.status === 'approved' && settlement.returnedMachines && settlement.returnedMachines.length > 0 && (
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-bold mb-4 text-gray-700">Returned Machines (History)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border rounded-lg">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial No.</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition Returned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {settlement.returnedMachines.map(m => (
                      <tr key={m._id} className="hover:bg-gray-50 text-sm bg-white">
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

      {activeTab === 'report' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Report Machine Issue</h2>
          <form onSubmit={handleReportSubmit}>
            <FormInput
              label="Select Machine"
              type="select"
              name="machineId"
              value={reportForm.machineId}
              onChange={(e) => setReportForm({ ...reportForm, machineId: e.target.value })}
              options={[
                { value: '', label: 'Select a Machine' },
                ...machines.filter(m => m.status === 'assigned').map(m => ({ value: m._id, label: `${m.machineTypeId?.name} (SN: ${m.serialNumber})` }))
              ]}
              required
            />
            <FormInput
              label="Issue Description"
              type="textarea"
              name="issue"
              value={reportForm.issue}
              onChange={(e) => setReportForm({ ...reportForm, issue: e.target.value })}
              required
            />
            <FormInput
              label="Estimated Repair Cost (₹)"
              type="number"
              name="estimatedCost"
              value={reportForm.estimatedCost}
              onChange={(e) => setReportForm({ ...reportForm, estimatedCost: e.target.value })}
              required
            />
            <button
              type="submit"
              className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
            >
              Report Issue
            </button>
          </form>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Reported Issues</h3>
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report._id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-red-600">Machine: {report.machineUnitId?.machineTypeId?.name} (SN: {report.machineUnitId?.serialNumber})</p>
                      <p className="text-sm text-gray-700 mt-1">{report.issue}</p>
                    </div>
                    <StatusBadge status={report.status} />
                  </div>

                  {report.status !== 'fixed' && report.status !== 'dead' && (
                    <div className="flex space-x-3 mt-4 pt-3 border-t border-gray-200">
                      {report.status === 'approved' ? (
                        <button
                          onClick={() => setRepairModal({ isOpen: true, reportId: report._id, cost: report.estimatedCost || '' })}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-semibold"
                        >
                          Mark Repaired (Enter Final Cost)
                        </button>
                      ) : (
                        <p className="text-gray-500 text-sm mt-2 italic flex-1">
                          {report.status === 'rejected' ? 'Repair rejected.' : 'Wait for Admin to approve repair...'}
                        </p>
                      )}

                      {report.status !== 'rejected' && (
                        <button
                          onClick={() => handleMarkDead(report._id)}
                          className="px-4 py-2 bg-gray-800 text-white text-sm rounded hover:bg-black"
                        >
                          Mark Dead / Scrap
                        </button>
                      )}
                    </div>
                  )}

                  {report.estimatedCost > 0 && report.status !== 'fixed' && (
                    <p className="text-sm font-semibold text-orange-600 mt-2">
                      Estimated Cost: ₹{report.estimatedCost}
                    </p>
                  )}

                  {report.status === 'fixed' && report.repairCost > 0 && (
                    <p className="text-sm font-semibold text-green-700 mt-2">
                      Repaired (Cost: ₹{report.repairCost})
                    </p>
                  )}
                </div>
              ))}
              {reports.length === 0 && (
                <p className="text-gray-500 text-sm">No machine issues reported on this site.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settlement' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Financial Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Estimated Cost</p>
                <p className="text-xl font-bold text-blue-600">₹{site.estimatedCost?.toLocaleString()}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Installment</p>
                <p className="text-xl font-bold text-green-600">₹{totalGiven.toLocaleString()}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Expense</p>
                <p className="text-xl font-bold text-red-600">₹{totalExpense.toLocaleString()}</p>
              </div>
              <div className={`${balance >= 0 ? 'bg-green-100' : 'bg-red-100'} p-4 rounded-lg border-2 ${balance >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                <p className="text-sm text-gray-600 font-semibold">Remaining Balance</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  ₹{balance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {(totalProgress < 90 && site.status !== 'completed') ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-500">
              <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <h3 className="text-lg font-medium text-slate-800 mb-1">Settlement Locked</h3>
              <p>Please reach at least 90% work progress to initiate Final Settlement.</p>
            </div>
          ) : (
            <>

              {balance > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold mb-4">Return Remaining Balance</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Amount to Return"
                      type="number"
                      name="returnAmount"
                      value={settlementForm.returnAmount}
                      onChange={(e) => setSettlementForm({ ...settlementForm, returnAmount: e.target.value })}
                      placeholder={`Max: ₹${balance.toLocaleString()}`}
                    />
                    <FormInput
                      label="Notes"
                      type="textarea"
                      name="notes"
                      value={settlementForm.notes}
                      onChange={(e) => setSettlementForm({ ...settlementForm, notes: e.target.value })}
                      placeholder="Additional notes"
                    />
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Machine Return Status</h2>
                <div className="space-y-3">
                  {machines.map((machine) => (
                    <div key={machine._id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{machine.machineTypeId?.name} - SN: {machine.serialNumber}</p>
                          <p className="text-sm text-gray-500">Current DB Condition: {machine.condition}</p>
                        </div>
                        <StatusBadge status={machine.status} />
                      </div>
                      {machine.status === 'assigned' && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                          <select
                            value={machineConditions[machine._id] || 'good'}
                            onChange={(e) => setMachineConditions({ ...machineConditions, [machine._id]: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="good">Good</option>
                            <option value="damaged">Damaged</option>
                            <option value="missing">Missing</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {settlement ? (
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Settlement Submitted</h2>
                    <StatusBadge status={settlement.status} />
                  </div>
                  <p className="text-gray-600 mb-2">You have submitted the final settlement. Waiting for Admin approval.</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm"><span className="font-semibold">Returned Amount:</span> ₹{settlement.returnAmount}</p>
                    <p className="text-sm"><span className="font-semibold">Notes:</span> {settlement.notes || 'None'}</p>
                  </div>
                  {settlement.returnedMachines && settlement.returnedMachines.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-gray-800 mb-2">Returned Machines:</h3>
                      <ul className="space-y-2">
                        {settlement.returnedMachines.map(m => (
                          <li key={m._id} className="text-sm bg-gray-50 p-2 rounded flex justify-between items-center border">
                            <span>{m.machineTypeId?.name} (SN: {m.serialNumber})</span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold
                              ${m.condition === 'good' ? 'bg-green-100 text-green-800' :
                                m.condition === 'damaged' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {m.condition}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {settlement.status === 'approved' && (
                    <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-lg text-sm border border-green-200">
                      <strong>Success!</strong> Admin has approved this settlement. No further action is required.
                    </div>
                  )}
                  {settlement.status === 'rejected' && (
                    <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-lg text-sm border border-red-200">
                      <strong>Rejected!</strong> Admin rejected your settlement. Please check with the admin or submit a new one.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-6">
                  <button
                    onClick={() => setIsConfirmModalOpen(true)}
                    disabled={site.status !== 'completed'}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                  >
                    Submit for Admin Approval
                  </button>
                  {site.status !== 'completed' && (
                    <p className="text-sm text-gray-500 mt-2 text-center">Site must be marked as completed first</p>
                  )}
                </div>
              )}
            </>
          )}

          <Modal
            isOpen={isConfirmModalOpen}
            onClose={() => setIsConfirmModalOpen(false)}
            title="Confirm Settlement Submission"
          >
            <div className="space-y-4">
              <p className="text-gray-700">Are you sure you want to submit this settlement for admin approval?</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Return Amount: <span className="font-semibold">₹{settlementForm.returnAmount || 0}</span></p>
                <p className="text-sm text-gray-600">Remaining Balance: <span className="font-semibold">₹{balance.toLocaleString()}</span></p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleFinalSubmit}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Confirm Submit
                </button>
                <button
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>

          {/* Repair Cost Modal */}
          <Modal
            isOpen={repairModal.isOpen}
            onClose={() => setRepairModal({ isOpen: false, reportId: '', cost: '' })}
            title="Repair Machine & Log Expense"
          >
            <div className="space-y-4">
              <p className="text-gray-700 text-sm">
                Enter the cost of repairing the machine. This will automatically log a Daily Expense.
              </p>
              <FormInput
                label="Total Repair Cost (₹)"
                type="number"
                value={repairModal.cost}
                onChange={(e) => setRepairModal({ ...repairModal, cost: e.target.value })}
                placeholder="e.g. 5000"
                required
              />
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={submitRepair}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                  Submit Repair Cost
                </button>
                <button
                  onClick={() => setRepairModal({ isOpen: false, reportId: '', cost: '' })}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SiteWork;
