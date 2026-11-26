import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { UsersController } from './users.controller';

const router = Router();
const usersController = new UsersController();

// Public login
router.post('/login', usersController.login);

// Quản lý Chủ trọ (Chỉ ADMIN hệ thống)
router.get('/landlords', authenticate, authorize('ADMIN'), usersController.getAllLandlords);
router.post('/landlords', authenticate, authorize('ADMIN'), usersController.createLandlord);
router.patch(
  '/landlords/:id/status',
  authenticate,
  authorize('ADMIN'),
  usersController.toggleLandlordStatus
);

// Khách thuê & tài khoản cá nhân
router.get('/', authenticate, authorize('ADMIN', 'LANDLORD'), usersController.getAllTenants);
router.get('/:id', authenticate, usersController.getUserById);
router.post('/', authenticate, authorize('ADMIN', 'LANDLORD'), usersController.createTenant);
router.put('/:id', authenticate, usersController.updateTenant);
router.put('/:id/password', authenticate, usersController.changePassword);

export default router;
