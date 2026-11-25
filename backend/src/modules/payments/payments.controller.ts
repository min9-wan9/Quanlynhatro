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

  async vnpayConfigStatus(req: Request, res: Response) {
    const clientOrigin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    const config = paymentsService.getVnpayConfig(clientOrigin);
    res.json({
      success: true,
      mode: config.mode,
      isRealSandbox: config.isRealSandbox,
      tmnCode: config.tmnCode,
    });
  }

  async createVnpayUrl(req: Request, res: Response) {
    try {
      const { invoiceId, bankCode, clientOrigin } = req.body;
      if (!invoiceId || typeof invoiceId !== 'string') {
        return res.status(400).json({ success: false, message: 'Thiếu mã hóa đơn (invoiceId).' });
      }

      const origin =
        (typeof clientOrigin === 'string' && clientOrigin) ||
        (typeof req.headers.origin === 'string' ? req.headers.origin : undefined);

      const result = await paymentsService.createVnpayPaymentUrl({
        invoiceId,
        bankCode: typeof bankCode === 'string' ? bankCode : undefined,
        clientIp: req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress,
        clientOrigin: origin,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async createVnpayTopupUrl(req: Request, res: Response) {
    try {
      const { userId, amount, bankCode, clientOrigin } = req.body;
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ success: false, message: 'Thiếu mã người dùng (userId).' });
      }

      const origin =
        (typeof clientOrigin === 'string' && clientOrigin) ||
        (typeof req.headers.origin === 'string' ? req.headers.origin : undefined);

      const result = await paymentsService.createVnpayTopupUrl({
        userId,
        amount: Number(amount),
        bankCode: typeof bankCode === 'string' ? bankCode : undefined,
        clientIp: req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress,
        clientOrigin: origin,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async simulateLocalVnpaySubmit(req: Request, res: Response) {
    try {
      const { params, outcome, bankCode, clientOrigin } = req.body;
      if (!params || typeof params !== 'object') {
        return res.status(400).json({ success: false, message: 'Thiếu tham số giao dịch.' });
      }

      const validOutcome =
        outcome === 'success' || outcome === 'cancelled' || outcome === 'insufficient_funds'
          ? outcome
          : 'cancelled';

      const origin =
        (typeof clientOrigin === 'string' && clientOrigin) ||
        (typeof req.headers.origin === 'string' ? req.headers.origin : undefined);

      const result = paymentsService.simulateLocalVnpaySubmit({
        rawParams: params,
        outcome: validOutcome,
        bankCode: typeof bankCode === 'string' ? bankCode : undefined,
        clientOrigin: origin,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async vnpayReturn(req: Request, res: Response) {
    try {
      const result = await paymentsService.handleVnpayCallback(
        req.query as Record<string, unknown>
      );
      const frontendUrl =
        process.env.FRONTEND_URL?.trim().replace(/\/$/, '') || 'http://localhost:5173';

      const searchParams = new URLSearchParams({
        vnpay_status: result.status,
      });
      if (result.targetType) searchParams.set('vnpay_type', result.targetType);
      if (result.invoiceId) searchParams.set('invoiceId', result.invoiceId);
      if (result.userId) searchParams.set('userId', result.userId);
      if (result.responseCode) searchParams.set('code', result.responseCode);
      if (result.transactionNo) searchParams.set('txnNo', result.transactionNo);
      if (result.amount !== undefined) searchParams.set('amount', String(result.amount));

      res.redirect(`${frontendUrl}/?${searchParams.toString()}`);
    } catch (error: any) {
      const frontendUrl =
        process.env.FRONTEND_URL?.trim().replace(/\/$/, '') || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/?vnpay_status=failed`);
    }
  }

  async vnpayIpn(req: Request, res: Response) {
    try {
      const result = await paymentsService.handleVnpayCallback(
        req.query as Record<string, unknown>
      );
      res.status(200).json({
        RspCode: result.rspCode,
        Message: result.message,
      });
    } catch {
      res.status(200).json({
        RspCode: '99',
        Message: 'Unknown error',
      });
    }
  }
}
