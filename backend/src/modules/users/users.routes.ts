import { Router } from 'express';
import { UsersController } from './users.controller';

const router = Router();
const usersController = new UsersController();

router.get('/', usersController.getAllTenants);
router.get('/:id', usersController.getUserById);
router.post('/', usersController.createTenant);
router.put('/:id', usersController.updateTenant);
router.post('/login', usersController.login);
router.put('/:id/password', usersController.changePassword);

export default router;
