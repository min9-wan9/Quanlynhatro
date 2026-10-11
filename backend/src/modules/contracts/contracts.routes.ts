import { Router } from 'express';
import { ContractsController } from './contracts.controller';

const router = Router();
const contractsController = new ContractsController();

router.post('/', contractsController.create);
router.get('/', contractsController.getAll);

// Check-in (Ký hợp đồng)
router.post('/:id/sign', contractsController.signContract);

// Check-out
router.post('/:id/check-out', contractsController.requestCheckOut);
router.post('/check-out/:requestId/process', contractsController.processCheckOut);

// Sửa và xóa hợp đồng
router.put('/:id', contractsController.update);
router.delete('/:id', contractsController.delete);

export default router;
