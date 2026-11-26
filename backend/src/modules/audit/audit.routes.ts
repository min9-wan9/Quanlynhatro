import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { AuditController } from './audit.controller';

const router = Router();
const controller = new AuditController();

// Chỉ ADMIN hệ thống mới được xem nhật ký hoạt động
router.get('/', authenticate, authorize('ADMIN'), controller.getLogs);

export default router;
