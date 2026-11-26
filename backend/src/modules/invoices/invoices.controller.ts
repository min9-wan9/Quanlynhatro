import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { InvoicesService } from './invoices.service';

const invoicesService = new InvoicesService();

export class InvoicesController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.query;
      const invoices = await invoicesService.getAllInvoices(
        req.user!,
        typeof userId === 'string' ? userId : undefined
      );
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const invoice = await invoicesService.getInvoiceById(
        req.params.id as string,
        req.user
      );
      if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
      res.json(invoice);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền xem hóa đơn này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const newInvoice = await invoicesService.createInvoice(req.body, req.user!);
      res.status(201).json(newInvoice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPaymentQr(req: AuthRequest, res: Response) {
    try {
      const qrData = await invoicesService.getPaymentQr(
        req.params.id as string,
        req.user
      );
      if (!qrData) return res.status(404).json({ message: 'Invoice not found' });
      res.json(qrData);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền xem mã QR hóa đơn này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async bulkGenerate(req: AuthRequest, res: Response) {
    try {
      const generated = await invoicesService.bulkGenerateInvoices(req.user!);
      res.json({
        message: 'Đã tạo hóa đơn thành công',
        count: generated.length,
        generated,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const invoice = await invoicesService.updateInvoice(
        req.params.id as string,
        req.body,
        req.user!
      );
      res.json(invoice);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền sửa hóa đơn này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      await invoicesService.deleteInvoice(req.params.id as string, req.user!);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền xóa hóa đơn này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async handleWebhook(req: Request, res: Response) {
    try {
      const payload = req.body;
      const result = await invoicesService.processWebhookPayment(payload);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
