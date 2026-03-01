import mongoose from 'mongoose';

const machineUnitSchema = new mongoose.Schema({
    machineTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MachineType',
        required: true
    },
    serialNumber: {
        type: String,
        required: [true, 'Serial number is required'],
        unique: true,
        trim: true,
        uppercase: true
    },
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    purchaseCost: {
        type: Number,
        required: [true, 'Purchase cost is required'],
        min: 0
    },
    status: {
        type: String,
        enum: ['available', 'assigned', 'repair'],
        default: 'available'
    },
    currentSiteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Site',
        default: null
    },
    condition: {
        type: String,
        enum: ['good', 'damaged', 'maintenance'],
        default: 'good'
    },
    lastMaintenanceDate: {
        type: Date
    }
}, {
    timestamps: true
});

export default mongoose.model('MachineUnit', machineUnitSchema);
