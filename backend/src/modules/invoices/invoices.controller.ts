import { Request, Response } from 'express';
import { InvoicesService } from './invoices.service';

const invoicesService = new InvoicesService();

export class InvoicesController {
  async getAll(req: Request, res: Response) {
    try {
      const { userId } = req.query;
      const invoices = await invoicesService.getAllInvoices(userId as string);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const invoice = await invoicesService.getInvoiceById(req.params.id as string);
      if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const newInvoice = await invoicesService.createInvoice(req.body);
      res.status(201).json(newInvoice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPaymentQr(req: Request, res: Response) {
    try {
      const qrData = await invoicesService.getPaymentQr(req.params.id as string);
      if (!qrData) return res.status(404).json({ message: 'Invoice not found' });
      res.json(qrData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async bulkGenerate(req: Request, res: Response) {
    try {
      const generated = await invoicesService.bulkGenerateInvoices();
      res.json({ message: 'Đã tạo hóa đơn thành công', count: generated.length, generated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const invoice = await invoicesService.updateInvoice(req.params.id as string, req.body);
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await invoicesService.deleteInvoice(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async handleWebhook(req: Request, res: Response) {
    try {
      // Trong thực tế, bạn cần verify signature/token của webhook tại đây
      // để đảm bảo request thực sự đến từ cổng thanh toán
      const payload = req.body;
      const result = await invoicesService.processWebhookPayment(payload);
      
      // Phải trả về 200 OK thật nhanh để cổng thanh toán không gửi lại (retry)
      res.status(200).json(result);
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

