import { Router } from 'express';
import { InvoicesController } from './invoices.controller';

const router = Router();
const controller = new InvoicesController();

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.get('/:id/payment-qr', controller.getPaymentQr);
router.post('/bulk-generate', controller.bulkGenerate);
router.post('/webhook', controller.handleWebhook); // Webhook endpoint

router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
