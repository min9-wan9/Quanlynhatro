import { Prisma } from '@prisma/client';
import prisma from '../../config/db';
import { AuthUser } from '../../middleware/auth.middleware';
import { auditService } from '../audit/audit.service';

export class InvoicesService {
  private canLandlordAccessInvoice(
    invoice: { landlordId: string | null; user?: { managedById: string | null } | null },
    landlordId: string
  ): boolean {
    return (
      invoice.landlordId === landlordId || invoice.user?.managedById === landlordId
    );
  }

  async getAllInvoices(reqUser: AuthUser, requestedUserId?: string) {
    let where: Prisma.InvoiceWhereInput = {};

    if (reqUser.role === 'TENANT') {
      where = { userId: reqUser.id };
    } else if (reqUser.role === 'LANDLORD') {
      where = {
        AND: [
          {
            OR: [
              { landlordId: reqUser.id },
              { user: { managedById: reqUser.id } },
            ],
          },
          ...(requestedUserId ? [{ userId: requestedUserId }] : []),
        ],
      };
    } else if (requestedUserId) {
      where = { userId: requestedUserId };
    }

    return prisma.invoice.findMany({
      where,
      include: {
        payments: true,
        user: {
          include: {
            contracts: {
              where: { isActive: true },
              include: { room: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoiceById(id: string, reqUser?: AuthUser) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { payments: true, user: true },
    });
    if (!invoice) return null;

    if (reqUser) {
      if (reqUser.role === 'TENANT' && invoice.userId !== reqUser.id) {
        throw new Error('FORBIDDEN');
      }
      if (
        reqUser.role === 'LANDLORD' &&
        !this.canLandlordAccessInvoice(invoice, reqUser.id)
      ) {
        throw new Error('FORBIDDEN');
      }
    }

    return invoice;
  }

  async createInvoice(data: any, reqUser: AuthUser) {
    const targetUser = data.userId
      ? await prisma.user.findUnique({ where: { id: data.userId } })
      : null;

    const landlordId =
      reqUser.role === 'LANDLORD'
        ? reqUser.id
        : data.landlordId || targetUser?.managedById || null;

    const invoice = await prisma.invoice.create({
      data: {
        ...data,
        landlordId,
      },
    });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId,
      action: 'CREATE_INVOICE',
      entityType: 'Invoice',
      entityId: invoice.id,
      description: `${reqUser.fullName} tạo hóa đơn "${invoice.title}" (${invoice.amount.toLocaleString('vi-VN')} đ)`,
    });

    return invoice;
  }

  async updateInvoiceStatus(
    id: string,
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE'
  ) {
    return prisma.invoice.update({ where: { id }, data: { status } });
  }

  async updateInvoice(id: string, data: any, reqUser: AuthUser) {
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) throw new Error('Invoice not found');
    if (
      reqUser.role === 'LANDLORD' &&
      !this.canLandlordAccessInvoice(existing, reqUser.id)
    ) {
      throw new Error('FORBIDDEN');
    }

    const {
      amount,
      title,
      dueDate,
      status,
      roomPrice,
      elecUsage,
      waterUsage,
      otherCosts,
    } = data;
    const updateData: any = {};
    if (amount !== undefined) updateData.amount = Number(amount);
    if (title !== undefined) updateData.title = title;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (status !== undefined) updateData.status = status;
    if (roomPrice !== undefined) updateData.roomPrice = Number(roomPrice);
    if (elecUsage !== undefined) updateData.elecUsage = Number(elecUsage);
    if (waterUsage !== undefined) updateData.waterUsage = Number(waterUsage);
    if (otherCosts !== undefined) updateData.otherCosts = Number(otherCosts);

    const updated = await prisma.invoice.update({
      where: { id },
      data: updateData,
    });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: existing.landlordId,
      action: 'UPDATE_INVOICE',
      entityType: 'Invoice',
      entityId: updated.id,
      description: `${reqUser.fullName} cập nhật hóa đơn "${updated.title}" (${updated.status})`,
    });

    return updated;
  }

  async deleteInvoice(id: string, reqUser: AuthUser) {
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) throw new Error('Invoice not found');
    if (
      reqUser.role === 'LANDLORD' &&
      !this.canLandlordAccessInvoice(existing, reqUser.id)
    ) {
      throw new Error('FORBIDDEN');
    }

    await prisma.payment.deleteMany({ where: { invoiceId: id } });
    const deleted = await prisma.invoice.delete({ where: { id } });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: existing.landlordId,
      action: 'DELETE_INVOICE',
      entityType: 'Invoice',
      entityId: id,
      description: `${reqUser.fullName} đã xóa hóa đơn "${existing.title}"`,
    });

    return deleted;
  }

  async getPaymentQr(id: string, reqUser?: AuthUser) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!invoice) return null;

    if (reqUser) {
      if (reqUser.role === 'TENANT' && invoice.userId !== reqUser.id) {
        throw new Error('FORBIDDEN');
      }
      if (
        reqUser.role === 'LANDLORD' &&
        !this.canLandlordAccessInvoice(invoice, reqUser.id)
      ) {
        throw new Error('FORBIDDEN');
      }
    }

    const bankBin = process.env.BANK_BIN || '970415';
    const accountNo = process.env.BANK_ACCOUNT_NO || '1111111111';
    const accountName = process.env.BANK_ACCOUNT_NAME || 'NGUYEN VAN A';

    const amount = invoice.amount;
    const addInfo = `PAY ${invoice.id}`;

    const qrUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;

    return {
      qrUrl,
      bankBin,
      accountNo,
      accountName,
      amount,
      addInfo,
    };
  }

  async bulkGenerateInvoices(reqUser: AuthUser) {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    const title = `Tiền phòng tháng ${month}/${year}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);

    const rooms = await prisma.room.findMany({
      where: {
        status: 'OCCUPIED',
        ...(reqUser.role === 'LANDLORD' ? { landlordId: reqUser.id } : {}),
      },
      include: {
        contracts: { where: { isActive: true }, include: { user: true } },
        utilityReadings: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 2 },
      },
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

        const totalAmount = room.price + elecUsage * elecPrice + waterUsage * waterPrice;

        const existing = await prisma.invoice.findFirst({
          where: { userId: contract.userId, title },
        });

        const invoiceLandlordId = room.landlordId ?? (reqUser.role === 'LANDLORD' ? reqUser.id : null);

        if (!existing) {
          let inv = await prisma.invoice.create({
            data: {
              title,
              amount: totalAmount,
              status: 'PENDING',
              dueDate,
              userId: contract.userId,
              landlordId: invoiceLandlordId,
              roomPrice: room.price,
              elecUsage,
              elecPrice,
              waterUsage,
              waterPrice,
              otherCosts: 0,
            },
          });

          if (contract.user.isAutoPay && contract.user.walletBalance >= inv.amount) {
            await prisma.user.update({
              where: { id: contract.userId },
              data: { walletBalance: { decrement: inv.amount } },
            });
            await prisma.payment.create({
              data: {
                amount: inv.amount,
                transactionId: `AUTO_${Date.now()}`,
                method: 'WALLET_AUTO_PAY',
                invoiceId: inv.id,
                userId: contract.userId,
              },
            });
            inv = await prisma.invoice.update({
              where: { id: inv.id },
              data: { status: 'PAID' },
            });
          }

          generated.push(inv);
        } else {
          let inv = await prisma.invoice.update({
            where: { id: existing.id },
            data: {
              amount: totalAmount,
              roomPrice: room.price,
              elecUsage,
              elecPrice,
              waterUsage,
              waterPrice,
              otherCosts: 0,
              landlordId: invoiceLandlordId,
            },
          });

          if (
            inv.status === 'PENDING' &&
            contract.user.isAutoPay &&
            contract.user.walletBalance >= inv.amount
          ) {
            await prisma.user.update({
              where: { id: contract.userId },
              data: { walletBalance: { decrement: inv.amount } },
            });
            await prisma.payment.create({
              data: {
                amount: inv.amount,
                transactionId: `AUTO_${Date.now()}`,
                method: 'WALLET_AUTO_PAY',
                invoiceId: inv.id,
                userId: contract.userId,
              },
            });
            inv = await prisma.invoice.update({
              where: { id: inv.id },
              data: { status: 'PAID' },
            });
          }

          generated.push(inv);
        }
      }
    }

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: reqUser.role === 'LANDLORD' ? reqUser.id : null,
      action: 'BULK_GENERATE_INVOICES',
      entityType: 'Invoice',
      description: `${reqUser.fullName} đã chốt và phát hành ${generated.length} hóa đơn ${title}`,
    });

    return generated;
  }

  // Xử lý Webhook từ cổng thanh toán (vd: SePay, Casso, PayOS)
  async processWebhookPayment(payload: any) {
    const { transactionId, amount, description } = payload;

    if (!description) return { success: false, message: 'No description' };

    const topupMatch = description.match(/TOPUP\s+([a-zA-Z0-9-]+)/i);
    if (topupMatch) {
      const userId = topupMatch[1];
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return { success: false, message: 'User not found for topup' };

      await prisma.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: Number(amount) } },
      });

      await auditService.log({
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        landlordId: user.managedById,
        action: 'WEBHOOK_TOPUP',
        entityType: 'User',
        entityId: user.id,
        description: `Nạp ví qua Webhook cho ${user.fullName}: +${Number(amount).toLocaleString('vi-VN')} đ`,
      });

      return {
        success: true,
        action: 'TOPUP',
        userId: user.id,
        newBalance: user.walletBalance + Number(amount),
      };
    }

    const match = description.match(/PAY\s+([a-zA-Z0-9-]+)/i);
    if (!match) return { success: false, message: 'Invalid format' };

    const invoiceId = match[1];

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { user: true },
    });
    if (!invoice) return { success: false, message: 'Invoice not found' };

    if (invoice.status === 'PAID') {
      return { success: true, message: 'Invoice already paid' };
    }

    await prisma.payment.create({
      data: {
        amount: Number(amount),
        transactionId: transactionId || 'SIMULATED_TX_ID',
        method: 'BANK_TRANSFER_WEBHOOK',
        invoiceId: invoice.id,
        userId: invoice.userId,
      },
    });

    const allPayments = await prisma.payment.findMany({ where: { invoiceId: invoice.id } });
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    let newStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' = invoice.status;
    if (totalPaid >= invoice.amount) {
      newStatus = 'PAID';
    } else if (totalPaid > 0) {
      newStatus = 'PARTIAL';
    }

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: newStatus },
    });

    await auditService.log({
      actorId: invoice.userId,
      actorName: invoice.user.fullName,
      actorRole: invoice.user.role,
      landlordId: invoice.landlordId,
      action: 'WEBHOOK_PAYMENT',
      entityType: 'Invoice',
      entityId: invoice.id,
      description: `Thanh toán hóa đơn "${invoice.title}" qua Webhook: ${Number(amount).toLocaleString('vi-VN')} đ (${newStatus})`,
    });

    return { success: true, action: 'PAY_INVOICE', invoiceId: invoice.id, status: newStatus };
  }
}
