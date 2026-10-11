import { Router } from 'express';
import { RoomsController } from './rooms.controller';

const router = Router();
const controller = new RoomsController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);
router.post('/:id/utilities', controller.saveUtility);

export default router;
