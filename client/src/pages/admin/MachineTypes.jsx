import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormInput from '../../components/FormInput';
import api from '../../services/api';

const MachineTypes = () => {
    const [types, setTypes] = useState([]);
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
    const [typeForm, setTypeForm] = useState({ name: '', category: 'soil_sampling', description: '', brand: '', model: '' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/machine-types');
            setTypes(res.data.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleTypeSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/machine-types/${editingId}`, typeForm);
            } else {
                await api.post('/machine-types', typeForm);
            }
            setIsTypeModalOpen(false);
            setTypeForm({ name: '', category: 'soil_sampling', description: '', brand: '', model: '' });
            setEditingId(null);
            fetchData();
        } catch (error) {
            console.error('Error saving machine type:', error);
            alert(error.response?.data?.message || 'Error saving type');
        }
    };

    const handleEdit = (type) => {
        setEditingId(type._id);
        setTypeForm({
            name: type.name,
            category: type.category,
            description: type.description || '',
            brand: type.brand || '',
            model: type.model || ''
        });
        setIsTypeModalOpen(true);
    };

    const handleDelete = async (type) => {
        if (window.confirm('Are you sure you want to delete this machine type?')) {
            try {
                await api.delete(`/machine-types/${type._id}`);
                fetchData();
            } catch (error) {
                console.error('Error deleting machine type:', error);
                alert(error.response?.data?.message || 'Failed to delete machine type');
            }
        }
    };

    const typeColumns = [
        { key: 'name', label: 'Machine Type' },
        { key: 'category', label: 'Category' },
        { key: 'brand', label: 'Brand', render: (val) => val || '-' },
        { key: 'model', label: 'Model', render: (val) => val || '-' },
        { key: 'description', label: 'Description' },
    ];

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Machine Types</h1>
                <button onClick={() => setIsTypeModalOpen(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add Type</button>
            </div>

            <div className="bg-white rounded-lg shadow">
                <DataTable columns={typeColumns} data={types} onEdit={handleEdit} onDelete={handleDelete} />
            </div>

            <Modal isOpen={isTypeModalOpen} onClose={() => { setIsTypeModalOpen(false); setEditingId(null); setTypeForm({ name: '', category: 'soil_sampling', description: '', brand: '', model: '' }); }} title={editingId ? "Edit Machine Type" : "Add Machine Type"}>
                <form onSubmit={handleTypeSubmit}>
                    <FormInput label="Name" name="name" value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} required />
                    <FormInput label="Brand" name="brand" value={typeForm.brand} onChange={e => setTypeForm({ ...typeForm, brand: e.target.value })} />
                    <FormInput label="Model" name="model" value={typeForm.model} onChange={e => setTypeForm({ ...typeForm, model: e.target.value })} />
                    <FormInput label="Category" type="select" name="category" value={typeForm.category} onChange={e => setTypeForm({ ...typeForm, category: e.target.value })} options={[
                        { value: 'soil_sampling', label: 'Soil Sampling' },
                        { value: 'field_analysis', label: 'Field Analysis' },
                        { value: 'lab_physical_testing', label: 'Lab Physical Testing' },
                        { value: 'lab_chemical_analysis', label: 'Lab Chemical Analysis' },
                        { value: 'compaction_testing', label: 'Compaction Testing' },
                        { value: 'surveying_mapping', label: 'Surveying & Mapping' },
                        { value: 'support_equipment', label: 'Support Equipment' },
                        { value: 'heavy_machinery', label: 'Heavy Machinery' },
                        { value: 'other', label: 'Other' }
                    ]} required />
                    <FormInput label="Description" type="textarea" name="description" value={typeForm.description} onChange={e => setTypeForm({ ...typeForm, description: e.target.value })} />
                    <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded-lg mt-4">{editingId ? 'Update' : 'Save'} Type</button>
                </form>
            </Modal>
        </DashboardLayout>
    );
};

export default MachineTypes;
