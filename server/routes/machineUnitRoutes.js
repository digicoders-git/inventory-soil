import express from 'express';
import { getMachineUnits, createMachineUnit, getAvailableUnits, getUnitsBySite, updateMachineUnit, deleteMachineUnit, purchaseMachineUnit } from '../controllers/machineUnitController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { roleMiddleware } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router
    .route('/')
    .get(getMachineUnits)
    .post(roleMiddleware('superadmin', 'admin'), createMachineUnit);

router.post('/purchase', purchaseMachineUnit);
router.get('/available', getAvailableUnits);
router.get('/site/:siteId', getUnitsBySite);

router
    .route('/:id')
    .put(roleMiddleware('superadmin', 'admin'), updateMachineUnit)
    .delete(roleMiddleware('superadmin', 'admin'), deleteMachineUnit);

export default router;
