import MachineMovement from '../models/MachineMovement.js';
import MachineUnit from '../models/MachineUnit.js';
import Site from '../models/Site.js';

// @desc    Get all movements
// @route   GET /api/movements
export const getMovements = async (req, res) => {
  try {
    const movements = await MachineMovement.find()
      .populate({
        path: 'machineUnitId',
        populate: { path: 'machineTypeId', select: 'name category' }
      })
      .populate('fromLocationId', 'name address')
      .populate('toLocationId', 'name address')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: movements
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Request movement
// @route   POST /api/movements
export const requestMovement = async (req, res) => {
  try {
    const { machineUnitId, fromLocationType, fromLocationId, toLocationType, toLocationId, notes } = req.body;

    const unit = await MachineUnit.findById(machineUnitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Machine unit not found' });
    }

    if (unit.status !== 'available' && unit.status !== 'assigned') {
      return res.status(400).json({ success: false, message: `Cannot move machine in ${unit.status} status` });
    }

    const movement = await MachineMovement.create({
      machineUnitId,
      fromLocationType,
      fromLocationId: fromLocationId || null,
      toLocationType,
      toLocationId: toLocationId || null,
      status: 'pending',
      requestedBy: req.user.id,
      notes
    });

    res.status(201).json({ success: true, data: movement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve movement
// @route   PUT /api/movements/:id/approve
export const approveMovement = async (req, res) => {
  try {
    const movement = await MachineMovement.findById(req.params.id);
    if (!movement) {
      return res.status(404).json({ success: false, message: 'Movement not found' });
    }

    if (movement.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Movement is not pending' });
    }

    const unit = await MachineUnit.findById(movement.machineUnitId);
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Machine unit not found' });
    }

    // Logic for updating the unit
    if (movement.toLocationType === 'site') {
      unit.status = 'assigned';
      unit.currentSiteId = movement.toLocationId;

      // Update Site status if it was 'created'
      const site = await Site.findById(movement.toLocationId);
      if (site && site.status === 'created') {
        site.status = 'machines_assigned';
        await site.save();
      }
    } else if (movement.toLocationType === 'repair') {
      unit.status = 'repair';
      unit.currentSiteId = null;
    } else if (movement.toLocationType === 'store') {
      unit.status = 'available';
      unit.currentSiteId = null;
    }

    await unit.save();

    movement.status = 'approved';
    movement.approvedBy = req.user.id;
    movement.movementDate = new Date();
    await movement.save();

    res.status(200).json({ success: true, data: movement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Complete movement
// @route   PUT /api/movements/:id/complete
export const completeMovement = async (req, res) => {
  try {
    const movement = await MachineMovement.findById(req.params.id);
    if (!movement) {
      return res.status(404).json({ success: false, message: 'Movement not found' });
    }

    movement.status = 'completed';
    await movement.save();

    res.status(200).json({ success: true, data: movement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
