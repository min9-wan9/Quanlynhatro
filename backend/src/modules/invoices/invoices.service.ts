import prisma from '../../config/db';
import { Prisma } from '@prisma/client';

export class InvoicesService {
  async getAllInvoices(userId?: string) {
    const where = userId ? { userId } : {};
    return prisma.invoice.findMany({ 
      where, 
      include: { 
        payments: true,
        user: {
          include: {
            contracts: {
              where: { isActive: true },
              include: { room: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getInvoiceById(id: string) {
    return prisma.invoice.findUnique({ where: { id }, include: { payments: true } });
  }

  async createInvoice(data: Prisma.InvoiceUncheckedCreateInput) {
    return prisma.invoice.create({ data });
  }

  async updateInvoiceStatus(id: string, status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE') {
    return prisma.invoice.update({ where: { id }, data: { status } });
  }

  async updateInvoice(id: string, data: any) {
    const { amount, title, dueDate, status, roomPrice, elecUsage, waterUsage, otherCosts } = data;
    const updateData: any = {};
    if (amount !== undefined) updateData.amount = Number(amount);
    if (title !== undefined) updateData.title = title;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (status !== undefined) updateData.status = status;
    if (roomPrice !== undefined) updateData.roomPrice = Number(roomPrice);
    if (elecUsage !== undefined) updateData.elecUsage = Number(elecUsage);
    if (waterUsage !== undefined) updateData.waterUsage = Number(waterUsage);
    if (otherCosts !== undefined) updateData.otherCosts = Number(otherCosts);

    return prisma.invoice.update({
      where: { id },
      data: updateData
    });
  }

  async deleteInvoice(id: string) {
    // Note: this will also delete associated payments due to cascade if configured in schema,
    // or we might need to delete payments first depending on Prisma schema.
    await prisma.payment.deleteMany({ where: { invoiceId: id } });
    return prisma.invoice.delete({ where: { id } });
  }

  async getPaymentQr(id: string) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) return null;

    // Lấy config từ biến môi trường
    const bankBin = process.env.BANK_BIN || '970415'; // Mặc định VietinBank BIN hoặc bất kỳ
    const accountNo = process.env.BANK_ACCOUNT_NO || '1111111111';
    const accountName = process.env.BANK_ACCOUNT_NAME || 'NGUYEN VAN A';
    
    const amount = invoice.amount;
    const addInfo = `PAY ${invoice.id}`; // Cú pháp chuyển khoản duy nhất

    // Sử dụng VietQR image generator API
    const qrUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;

    return {
      qrUrl,
      bankBin,
      accountNo,
      accountName,
      amount,
      addInfo
    };
  }

  async bulkGenerateInvoices() {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const title = `Tiền phòng tháng ${month}/${year}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);

    const rooms = await prisma.room.findMany({
      where: { status: 'OCCUPIED' },
      include: {
        contracts: { where: { isActive: true }, include: { user: true } },
        utilityReadings: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 2 }
      }
    });

    const generated = [];
    for (const room of rooms) {
      if (room.contracts.length > 0) {
        const contract = room.contracts[0];
        if (!contract) continue;
        
        const utils = room.utilityReadings || [];
        const curr = utils[0] || { powerNumber: 0, waterNumber: 0 };
        const prev = utils[1] || { powerNumber: 0, waterNumber: 0 };
        
        const elecUsage = Math.max(0, curr.powerNumber - prev.powerNumber);
        const waterUsage = Math.max(0, curr.waterNumber - prev.waterNumber);
        
        const elecPrice = 3500;
        const waterPrice = 20000;
        
        const totalAmount = room.price + (elecUsage * elecPrice) + (waterUsage * waterPrice);
        
        const existing = await prisma.invoice.findFirst({
          where: { userId: contract.userId, title }
        });
        
        if (!existing) {
          let inv = await prisma.invoice.create({
            data: {
              title,
              amount: totalAmount,
              status: 'PENDING',
              dueDate,
              userId: contract.userId,
              roomPrice: room.price,
              elecUsage,
              elecPrice,
              waterUsage,
              waterPrice,
              otherCosts: 0
            }
          });
          
          // Auto Pay Logic
          if (contract.user.isAutoPay && contract.user.walletBalance >= inv.amount) {
            await prisma.user.update({
              where: { id: contract.userId },
              data: { walletBalance: { decrement: inv.amount } }
            });
            await prisma.payment.create({
              data: {
                amount: inv.amount,
                transactionId: `AUTO_${Date.now()}`,
                method: 'WALLET_AUTO_PAY',
                invoiceId: inv.id,
                userId: contract.userId
              }
            });
            inv = await prisma.invoice.update({
              where: { id: inv.id },
              data: { status: 'PAID' }
            });
          }

          generated.push(inv);
        } else {
          // Update old invoices that might have missing breakdown
          let inv = await prisma.invoice.update({
            where: { id: existing.id },
            data: {
              amount: totalAmount,
              roomPrice: room.price,
              elecUsage,
              elecPrice,
              waterUsage,
              waterPrice,
              otherCosts: 0
            }
          });
          
          if (inv.status === 'PENDING' && contract.user.isAutoPay && contract.user.walletBalance >= inv.amount) {
             await prisma.user.update({
              where: { id: contract.userId },
              data: { walletBalance: { decrement: inv.amount } }
            });
            await prisma.payment.create({
              data: {
                amount: inv.amount,
                transactionId: `AUTO_${Date.now()}`,
                method: 'WALLET_AUTO_PAY',
                invoiceId: inv.id,
                userId: contract.userId
              }
            });
            inv = await prisma.invoice.update({
              where: { id: inv.id },
              data: { status: 'PAID' }
            });
          }
          
          generated.push(inv);
        }
      }
    }
    return generated;
  }

  // Xử lý Webhook từ cổng thanh toán (vd: SePay, Casso, PayOS)
  async processWebhookPayment(payload: any) {
    const { transactionId, amount, description } = payload;
    
    if (!description) return { success: false, message: 'No description' };

    // Xử lý nạp tiền vào ví nội bộ (Cú pháp: TOPUP <user_id>)
    const topupMatch = description.match(/TOPUP\s+([a-zA-Z0-9-]+)/i);
    if (topupMatch) {
      const userId = topupMatch[1];
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { success: false, message: 'User not found for topup' };

      await prisma.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: Number(amount) } }
      });
      return { success: true, action: 'TOPUP', userId: user.id, newBalance: user.walletBalance + Number(amount) };
    }

    // Xử lý thanh toán hóa đơn (cú pháp: PAY <invoice_id>)
    const match = description.match(/PAY\s+([a-zA-Z0-9-]+)/i);
    if (!match) return { success: false, message: 'Invalid format' };

    const invoiceId = match[1];

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return { success: false, message: 'Invoice not found' };

    if (invoice.status === 'PAID') {
      return { success: true, message: 'Invoice already paid' };
    }

    // Tạo record thanh toán
    await prisma.payment.create({
      data: {
        amount: Number(amount),
        transactionId: transactionId || 'SIMULATED_TX_ID',
        method: 'BANK_TRANSFER_WEBHOOK',
        invoiceId: invoice.id,
        userId: invoice.userId
      }
    });

    // Tính tổng số tiền đã thanh toán cho hóa đơn này
    const allPayments = await prisma.payment.findMany({ where: { invoiceId: invoice.id } });
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    let newStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' = invoice.status;
    if (totalPaid >= invoice.amount) {
      newStatus = 'PAID';
    } else if (totalPaid > 0) {
      newStatus = 'PARTIAL';
    }

    // Cập nhật trạng thái hóa đơn
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: newStatus }
    });

    return { success: true, action: 'PAY_INVOICE', invoiceId: invoice.id, status: newStatus };
  }
}

