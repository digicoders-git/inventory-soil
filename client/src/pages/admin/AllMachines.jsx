import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import DataTable from '../../components/DataTable';
import api from '../../services/api';

const AllMachines = () => {
    const [data, setData] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [typeRes, unitRes] = await Promise.all([
                api.get('/machine-types'),
                api.get('/machine-units')
            ]);
            const types = typeRes.data.data;
            const units = unitRes.data.data;

            // Group units by type
            const summary = types.map(type => {
                const typeUnits = units.filter(u => u.machineTypeId && u.machineTypeId._id === type._id);
                const availableUnits = typeUnits.filter(u => u.status === 'available').length;
                const totalQuantity = typeUnits.length;
                return {
                    _id: type._id,
                    name: type.name,
                    category: type.category,
                    totalQuantity,
                    availableQuantity: availableUnits,
                    status: availableUnits > 0 ? 'available' : (totalQuantity > 0 ? 'unavailable' : 'out_of_stock')
                }
            });
            setData(summary);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const columns = [
        { key: 'name', label: 'Machine Type' },
        { key: 'category', label: 'Category', render: (val) => val.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) },
        { key: 'totalQuantity', label: 'Total Quantity' },
        { key: 'availableQuantity', label: 'Available Quantity' },
        {
            key: 'status',
            label: 'Status',
            render: (val, item) => (
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.availableQuantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {item.availableQuantity > 0 ? 'Available' : 'Out of Stock'}
                </span>
            )
        }
    ];

    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">All Machines Overview</h1>
            </div>

            <div className="bg-white rounded-lg shadow">
                <DataTable columns={columns} data={data} />
            </div>
        </DashboardLayout>
    );
};

export default AllMachines;
