import { Router } from 'express';
import { PaymentsController } from './payments.controller';

const router = Router();
const controller = new PaymentsController();

// Endpoint nhận IPN từ cổng thanh toán (SePay / Casso giả lập)
router.post('/webhook', controller.webhook);

// VNPay Sandbox endpoints
router.get('/vnpay/config-status', controller.vnpayConfigStatus);
router.post('/vnpay/create-url', controller.createVnpayUrl);
router.post('/vnpay/create-topup-url', controller.createVnpayTopupUrl);
router.post('/vnpay-sandbox/submit', controller.simulateLocalVnpaySubmit);
router.get('/vnpay-return', controller.vnpayReturn);
router.get('/vnpay-ipn', controller.vnpayIpn);

export default router;
