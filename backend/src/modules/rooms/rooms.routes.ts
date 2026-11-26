import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { RoomsController } from './rooms.controller';

const router = Router();
const controller = new RoomsController();

router.get('/', authenticate, authorize('ADMIN', 'LANDLORD'), controller.getAll);
router.get('/:id', authenticate, authorize('ADMIN', 'LANDLORD', 'TENANT'), controller.getById);
router.post('/', authenticate, authorize('LANDLORD', 'ADMIN'), controller.create);
router.put('/:id', authenticate, authorize('LANDLORD', 'ADMIN'), controller.update);
router.delete('/:id', authenticate, authorize('LANDLORD', 'ADMIN'), controller.delete);
router.post('/:id/utilities', authenticate, authorize('LANDLORD', 'ADMIN'), controller.saveUtility);

export default router;
