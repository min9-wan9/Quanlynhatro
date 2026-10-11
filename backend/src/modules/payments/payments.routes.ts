import { Router } from 'express';
import { PaymentsController } from './payments.controller';

const router = Router();
const controller = new PaymentsController();

// Endpoint nhận IPN từ cổng thanh toán
router.post('/webhook', controller.webhook);

export default router;
