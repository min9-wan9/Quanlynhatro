import { Request, Response } from 'express';
import { PaymentsService } from './payments.service';

const paymentsService = new PaymentsService();

export class PaymentsController {
  async webhook(req: Request, res: Response) {
    try {
      // Xác thực API Key / Secret Key từ cổng thanh toán (SePay/Casso)
      const apiKey = req.headers['authorization'] || req.headers['x-api-key'];
      const expectedKey = process.env.PAYMENT_WEBHOOK_SECRET;

      if (expectedKey && apiKey !== `Bearer ${expectedKey}` && apiKey !== expectedKey) {
        return res.status(401).json({ success: false, message: 'Xác thực Webhook thất bại.' });
      }

      // Payload structure depends on SePay / Casso
      // Dưới đây giả định cấu trúc chung chung gồm: transactionId, transferAmount, content
      const payload = req.body;
      const result = await paymentsService.processWebhook(payload);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
