import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';

const MachineUnits = () => {
    const [types, setTypes] = useState([]);
    const [units, setUnits] = useState([]);

    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [unitForm, setUnitForm] = useState({ machineTypeId: '', serialNumber: '', purchaseCost: '', purchaseDate: '', condition: 'good' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [typeRes, unitRes] = await Promise.all([
                api.get('/machine-types'),
                api.get('/machine-units')
            ]);
            setTypes(typeRes.data.data);
            setUnits(unitRes.data.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleUnitSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/machine-units/${editingId}`, unitForm);
            } else {
                await api.post('/machine-units', unitForm);
            }
            setIsUnitModalOpen(false);
            setUnitForm({ machineTypeId: '', serialNumber: '', purchaseCost: '', purchaseDate: '', condition: 'good' });
            setEditingId(null);
            fetchData();
        } catch (error) {
            console.error('Error saving machine unit:', error);
            alert(error.response?.data?.message || 'Error saving unit');
        }
    };

    const handleEdit = (unit) => {
        setEditingId(unit._id);
        setUnitForm({
            machineTypeId: unit.machineTypeId?._id || unit.machineTypeId || '',
            serialNumber: unit.serialNumber,
            purchaseCost: unit.purchaseCost || '',
            purchaseDate: unit.purchaseDate ? new Date(unit.purchaseDate).toISOString().split('T')[0] : '',
            condition: unit.condition || 'good'
        });
        setIsUnitModalOpen(true);
    };

    const handleDelete = async (unit) => {
        if (window.confirm('Are you sure you want to delete this machine unit?')) {
            try {
                await api.delete(`/machine-units/${unit._id}`);
                fetchData();
            } catch (error) {
                console.error('Error deleting machine unit:', error);
                alert(error.response?.data?.message || 'Failed to delete machine unit');
            }
        }
    };

    const unitColumns = [
        { key: 'serialNumber', label: 'Serial No.' },
        { key: 'machineTypeId', label: 'Type', render: (val) => val?.name || '-' },
        { key: 'status', label: 'Status', render: (val) => <StatusBadge status={val} /> },
        { key: 'condition', label: 'Condition' },
        { key: 'currentSiteId', label: 'Current Site', render: (val) => val?.name || '-' },
    ];

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Machine Units</h1>
                <button onClick={() => setIsUnitModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Unit</button>
            </div>

            <div className="bg-white rounded-lg shadow">
                <DataTable columns={unitColumns} data={units} onEdit={handleEdit} onDelete={handleDelete} />
            </div>

            <Modal isOpen={isUnitModalOpen} onClose={() => { setIsUnitModalOpen(false); setEditingId(null); setUnitForm({ machineTypeId: '', serialNumber: '', purchaseCost: '', purchaseDate: '', condition: 'good' }); }} title={editingId ? "Edit Machine Unit" : "Add Machine Unit"}>
                <form onSubmit={handleUnitSubmit}>
                    <FormInput label="Machine Type" type="select" name="machineTypeId" value={unitForm.machineTypeId} onChange={e => setUnitForm({ ...unitForm, machineTypeId: e.target.value })}
                        options={[...types.map(t => ({ value: t._id, label: t.name }))]} required />
                    <FormInput label="Serial Number" name="serialNumber" value={unitForm.serialNumber} onChange={e => setUnitForm({ ...unitForm, serialNumber: e.target.value })} required />
                    <FormInput label="Purchase Cost (₹)" type="number" name="purchaseCost" value={unitForm.purchaseCost} onChange={e => setUnitForm({ ...unitForm, purchaseCost: e.target.value })} required />
                    <FormInput label="Purchase Date" type="date" name="purchaseDate" value={unitForm.purchaseDate} onChange={e => setUnitForm({ ...unitForm, purchaseDate: e.target.value })} />
                    <FormInput label="Condition" type="select" name="condition" value={unitForm.condition} onChange={e => setUnitForm({ ...unitForm, condition: e.target.value })} options={[
                        { value: 'good', label: 'Good' }, { value: 'damaged', label: 'Damaged' }, { value: 'maintenance', label: 'Under Maintenance' }
                    ]} />
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg mt-4">{editingId ? 'Update' : 'Save'} Unit</button>
                </form>
            </Modal>
        </DashboardLayout>
    );
};

export default MachineUnits;
