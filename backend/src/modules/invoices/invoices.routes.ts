import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { InvoicesController } from './invoices.controller';

const router = Router();
const controller = new InvoicesController();

// External webhook stays public
router.post('/webhook', controller.handleWebhook);

router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, controller.getById);
router.get('/:id/payment-qr', authenticate, controller.getPaymentQr);
router.post('/', authenticate, authorize('LANDLORD', 'ADMIN'), controller.create);
router.post('/bulk-generate', authenticate, authorize('LANDLORD', 'ADMIN'), controller.bulkGenerate);
router.put('/:id', authenticate, authorize('LANDLORD', 'ADMIN'), controller.update);
router.delete('/:id', authenticate, authorize('LANDLORD', 'ADMIN'), controller.delete);

export default router;
