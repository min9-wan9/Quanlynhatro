import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { ContractsController } from './contracts.controller';

const router = Router();
const contractsController = new ContractsController();

router.post('/', authenticate, authorize('LANDLORD', 'ADMIN'), contractsController.create);
router.get('/', authenticate, contractsController.getAll);

// Check-in (Ký hợp đồng)
router.post('/:id/sign', authenticate, contractsController.signContract);

// Check-out
router.post('/:id/check-out', authenticate, contractsController.requestCheckOut);
router.post(
  '/check-out/:requestId/process',
  authenticate,
  authorize('LANDLORD', 'ADMIN'),
  contractsController.processCheckOut
);

// Sửa và xóa hợp đồng
router.put('/:id', authenticate, authorize('LANDLORD', 'ADMIN'), contractsController.update);
router.delete('/:id', authenticate, authorize('LANDLORD', 'ADMIN'), contractsController.delete);

export default router;
