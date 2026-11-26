import prisma from '../../config/db';
import { auditService } from '../audit/audit.service';
import {
  buildVnpSignData,
  formatVnpDate,
  normalizeClientIp,
  parseVnpayTxnRef,
  signVnpParams,
  verifyVnpSignature,
} from './vnpay.helper';

export interface CreateVnpayUrlInput {
  invoiceId: string;
  bankCode?: string | undefined;
  clientIp?: string | string[] | undefined;
  clientOrigin?: string | undefined;
}

export interface CreateVnpayTopupUrlInput {
  userId: string;
  amount: number;
  bankCode?: string | undefined;
  clientIp?: string | string[] | undefined;
  clientOrigin?: string | undefined;
}

export interface VnpayCallbackResult {
  rspCode: string;
  message: string;
  status: 'success' | 'cancelled' | 'failed' | 'invalid_signature' | 'not_found' | 'invalid_amount';
  targetType?: 'invoice' | 'topup' | undefined;
  invoiceId?: string | undefined;
  userId?: string | undefined;
  txnRef?: string | undefined;
  transactionNo?: string | undefined;
  responseCode?: string | undefined;
  amount?: number | undefined;
}

const processedTopupTxIds = new Set<string>();

export class PaymentsService {
  getVnpayConfig(clientOrigin?: string) {
    const envTmnCode = process.env.VNP_TMN_CODE?.trim();
    const envSecret = process.env.VNP_HASH_SECRET?.trim();
    const isRealSandbox = Boolean(
      envTmnCode &&
        envSecret &&
        !envTmnCode.startsWith('YOUR_') &&
        !envSecret.startsWith('YOUR_')
    );

    const safeOrigin =
      clientOrigin && /^https?:\/\/[^/\s]+$/i.test(clientOrigin.trim())
        ? clientOrigin.trim().replace(/\/$/, '')
        : undefined;

    const frontendUrl =
      safeOrigin ||
      process.env.FRONTEND_URL?.trim().replace(/\/$/, '') ||
      'http://localhost:5173';

    const tmnCode = isRealSandbox ? (envTmnCode as string) : 'SMARTHOST_TEST';
    const hashSecret = isRealSandbox
      ? (envSecret as string)
      : envSecret || 'LOCAL_VNPAY_SANDBOX_SECRET';

    const vnpUrl = isRealSandbox
      ? process.env.VNP_URL?.trim() || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
      : `${frontendUrl}/vnpay-sandbox`;

    const returnUrl =
      process.env.VNP_RETURN_URL?.trim() || `${frontendUrl}/api/payments/vnpay-return`;

    return {
      isRealSandbox,
      mode: (isRealSandbox ? 'vnpay_sandbox' : 'local_simulator') as
        | 'vnpay_sandbox'
        | 'local_simulator',
      tmnCode,
      hashSecret,
      vnpUrl,
      returnUrl,
      frontendUrl,
    };
  }

  private buildSignedVnpayUrl(params: {
    txnRef: string;
    orderInfo: string;
    amountVnd: number;
    bankCode?: string | undefined;
    clientIp?: string | string[] | undefined;
    clientOrigin?: string | undefined;
  }) {
    const config = this.getVnpayConfig(params.clientOrigin);
    const now = new Date();
    const expire = new Date(now.getTime() + 15 * 60 * 1000);

    const vnpParams: Record<string, string | number> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: config.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: params.txnRef,
      vnp_OrderInfo: params.orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: Math.round(params.amountVnd * 100),
      vnp_ReturnUrl: config.returnUrl,
      vnp_IpAddr: normalizeClientIp(params.clientIp),
      vnp_CreateDate: formatVnpDate(now),
      vnp_ExpireDate: formatVnpDate(expire),
    };

    if (params.bankCode && params.bankCode.trim()) {
      vnpParams.vnp_BankCode = params.bankCode.trim();
    }

    const secureHash = signVnpParams(vnpParams, config.hashSecret);
    const queryStr = `${buildVnpSignData(vnpParams)}&vnp_SecureHash=${secureHash}`;

    return {
      paymentUrl: `${config.vnpUrl}?${queryStr}`,
      mode: config.mode,
      txnRef: params.txnRef,
      amount: params.amountVnd,
    };
  }

  async createVnpayPaymentUrl(input: CreateVnpayUrlInput) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { payments: true },
    });

    if (!invoice) {
      return { success: false as const, message: 'Không tìm thấy hóa đơn trên hệ thống.' };
    }

    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const remainingAmount = Math.max(0, invoice.amount - totalPaid);

    if (invoice.status === 'PAID' || remainingAmount <= 0) {
      return { success: false as const, message: 'Hóa đơn này đã được thanh toán đầy đủ.' };
    }

    const signed = this.buildSignedVnpayUrl({
      txnRef: `${invoice.id}_${Date.now()}`,
      orderInfo: `Thanh toan hoa don ${invoice.id}`,
      amountVnd: remainingAmount,
      bankCode: input.bankCode,
      clientIp: input.clientIp,
      clientOrigin: input.clientOrigin,
    });

    return {
      success: true as const,
      ...signed,
    };
  }

  async createVnpayTopupUrl(input: CreateVnpayTopupUrlInput) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount < 10000) {
      return {
        success: false as const,
        message: 'Số tiền nạp tối thiểu là 10.000 ₫.',
      };
    }

    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!user) {
      return { success: false as const, message: 'Không tìm thấy tài khoản người dùng.' };
    }

    const signed = this.buildSignedVnpayUrl({
      txnRef: `TOPUP_${user.id}_${Date.now()}`,
      orderInfo: `Nap tien vi nha tro ${user.id}`,
      amountVnd: Math.round(amount),
      bankCode: input.bankCode,
      clientIp: input.clientIp,
      clientOrigin: input.clientOrigin,
    });

    return {
      success: true as const,
      ...signed,
    };
  }

  simulateLocalVnpaySubmit(params: {
    rawParams: Record<string, unknown>;
    outcome: 'success' | 'cancelled' | 'insufficient_funds';
    bankCode?: string | undefined;
    clientOrigin?: string | undefined;
  }) {
    const config = this.getVnpayConfig(params.clientOrigin);
    if (config.isRealSandbox) {
      return {
        success: false as const,
        message: 'Chế độ giả lập nội bộ bị tắt khi đang dùng VNPay Sandbox thật.',
      };
    }

    if (!verifyVnpSignature(params.rawParams, config.hashSecret)) {
      return {
        success: false as const,
        message: 'Chữ ký giao dịch không hợp lệ (vnp_SecureHash mismatch).',
      };
    }

    const getStr = (k: string) =>
      typeof params.rawParams[k] === 'string' ? (params.rawParams[k] as string) : '';

    const responseCode =
      params.outcome === 'success'
        ? '00'
        : params.outcome === 'insufficient_funds'
          ? '51'
          : '24';
    const transactionStatus = params.outcome === 'success' ? '00' : '02';
    const transactionNo =
      params.outcome === 'success' ? String(Math.floor(10000000 + Math.random() * 89999999)) : '0';

    const returnParams: Record<string, string> = {
      vnp_Amount: getStr('vnp_Amount'),
      vnp_BankCode: params.bankCode?.trim() || getStr('vnp_BankCode') || 'NCB',
      vnp_BankTranNo:
        params.outcome === 'success' ? `VNP${Date.now().toString().slice(-8)}` : '',
      vnp_CardType: 'ATM',
      vnp_OrderInfo: getStr('vnp_OrderInfo'),
      vnp_PayDate: formatVnpDate(),
      vnp_ResponseCode: responseCode,
      vnp_TmnCode: getStr('vnp_TmnCode') || config.tmnCode,
      vnp_TransactionNo: transactionNo,
      vnp_TransactionStatus: transactionStatus,
      vnp_TxnRef: getStr('vnp_TxnRef'),
    };

    const secureHash = signVnpParams(returnParams, config.hashSecret);
    const returnBase = getStr('vnp_ReturnUrl') || config.returnUrl;
    const separator = returnBase.includes('?') ? '&' : '?';
    const redirectUrl = `${returnBase}${separator}${buildVnpSignData(returnParams)}&vnp_SecureHash=${secureHash}`;

    return {
      success: true as const,
      redirectUrl,
    };
  }

  private async handleTopupCallback(params: {
    userId: string;
    txnRef: string;
    responseCode: string;
    transactionStatus: string;
    transactionNo: string;
    vnpAmount: number;
  }): Promise<VnpayCallbackResult> {
    const user = await prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) {
      return {
        rspCode: '01',
        message: 'Order not found',
        status: 'not_found',
        targetType: 'topup',
        userId: params.userId,
        txnRef: params.txnRef,
      };
    }

    if (params.responseCode !== '00' || (params.transactionStatus && params.transactionStatus !== '00')) {
      return {
        rspCode: '00',
        message: 'Transaction not successful',
        status: params.responseCode === '24' ? 'cancelled' : 'failed',
        targetType: 'topup',
        userId: user.id,
        txnRef: params.txnRef,
        responseCode: params.responseCode,
        amount: Number.isFinite(params.vnpAmount) ? params.vnpAmount : undefined,
      };
    }

    if (!Number.isFinite(params.vnpAmount) || params.vnpAmount <= 0) {
      return {
        rspCode: '04',
        message: 'Invalid amount',
        status: 'invalid_amount',
        targetType: 'topup',
        userId: user.id,
        txnRef: params.txnRef,
      };
    }

    const paymentTxId =
      params.transactionNo && params.transactionNo !== '0'
        ? `VNPAY_TOPUP_${params.transactionNo}`
        : `VNPAY_TOPUP_${params.txnRef}`;

    const existingPayment = await prisma.payment.findFirst({
      where: { transactionId: paymentTxId },
    });

    if (existingPayment || processedTopupTxIds.has(paymentTxId)) {
      return {
        rspCode: '02',
        message: 'Order already confirmed',
        status: 'success',
        targetType: 'topup',
        userId: user.id,
        txnRef: params.txnRef,
        transactionNo: params.transactionNo,
        responseCode: params.responseCode,
        amount: params.vnpAmount,
      };
    }

    try {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { walletBalance: { increment: params.vnpAmount } },
        }),
        prisma.payment.create({
          data: {
            amount: params.vnpAmount,
            transactionId: paymentTxId,
            method: 'VNPAY_TOPUP_SANDBOX',
            userId: user.id,
          },
        }),
      ]);
      processedTopupTxIds.add(paymentTxId);
    } catch (error) {
      // Fallback if local DB hasn't run `prisma db push` for nullable Payment.invoiceId yet
      console.warn('Payment record skipped during topup (run prisma db push):', error);
      await prisma.user.update({
        where: { id: user.id },
        data: { walletBalance: { increment: params.vnpAmount } },
      });
      processedTopupTxIds.add(paymentTxId);
    }

    await auditService.log({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      landlordId: user.managedById,
      action: 'VNPAY_TOPUP',
      entityType: 'User',
      entityId: user.id,
      description: `${user.fullName} nạp ví qua VNPay Sandbox: +${params.vnpAmount.toLocaleString('vi-VN')} đ`,
      metadata: { txnRef: params.txnRef, transactionNo: params.transactionNo },
    });

    return {
      rspCode: '00',
      message: 'Confirm Success',
      status: 'success',
      targetType: 'topup',
      userId: user.id,
      txnRef: params.txnRef,
      transactionNo: params.transactionNo,
      responseCode: params.responseCode,
      amount: params.vnpAmount,
    };
  }

  async handleVnpayCallback(query: Record<string, unknown>): Promise<VnpayCallbackResult> {
    const config = this.getVnpayConfig();

    if (!verifyVnpSignature(query, config.hashSecret)) {
      return {
        rspCode: '97',
        message: 'Invalid signature',
        status: 'invalid_signature',
      };
    }

    const getStr = (k: string) => {
      const val = query[k];
      if (typeof val === 'string') return val;
      if (Array.isArray(val) && typeof val[0] === 'string') return val[0];
      return '';
    };

    const txnRef = getStr('vnp_TxnRef');
    const target = parseVnpayTxnRef(txnRef);
    const responseCode = getStr('vnp_ResponseCode');
    const transactionStatus = getStr('vnp_TransactionStatus');
    const transactionNo = getStr('vnp_TransactionNo');
    const vnpAmount = Number(getStr('vnp_Amount')) / 100;

    if (!target.id) {
      return {
        rspCode: '01',
        message: 'Order not found',
        status: 'not_found',
      };
    }

    if (target.type === 'topup') {
      return this.handleTopupCallback({
        userId: target.id,
        txnRef,
        responseCode,
        transactionStatus,
        transactionNo,
        vnpAmount,
      });
    }

    const invoiceId = target.id;
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, user: true },
    });

    if (!invoice) {
      return {
        rspCode: '01',
        message: 'Order not found',
        status: 'not_found',
        targetType: 'invoice',
        invoiceId,
        txnRef,
      };
    }

    if (responseCode !== '00' || (transactionStatus && transactionStatus !== '00')) {
      return {
        rspCode: '00',
        message: 'Transaction not successful',
        status: responseCode === '24' ? 'cancelled' : 'failed',
        targetType: 'invoice',
        invoiceId,
        txnRef,
        responseCode,
        amount: Number.isFinite(vnpAmount) ? vnpAmount : undefined,
      };
    }

    const totalPaidBefore = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const expectedRemaining = Math.max(0, invoice.amount - totalPaidBefore);

    const paymentTxId =
      transactionNo && transactionNo !== '0' ? `VNPAY_${transactionNo}` : `VNPAY_${txnRef}`;

    const existingPayment = await prisma.payment.findFirst({
      where: { transactionId: paymentTxId },
    });

    if (existingPayment || invoice.status === 'PAID' || expectedRemaining <= 0) {
      return {
        rspCode: '02',
        message: 'Order already confirmed',
        status: 'success',
        targetType: 'invoice',
        invoiceId,
        txnRef,
        transactionNo,
        responseCode,
        amount: Number.isFinite(vnpAmount) ? vnpAmount : invoice.amount,
      };
    }

    if (!Number.isFinite(vnpAmount) || vnpAmount <= 0 || Math.abs(vnpAmount - expectedRemaining) > 1) {
      return {
        rspCode: '04',
        message: 'Invalid amount',
        status: 'invalid_amount',
        targetType: 'invoice',
        invoiceId,
        txnRef,
        amount: Number.isFinite(vnpAmount) ? vnpAmount : undefined,
      };
    }

    const totalPaidNow = totalPaidBefore + vnpAmount;
    const newStatus = totalPaidNow >= invoice.amount ? 'PAID' : 'PARTIAL';

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          amount: vnpAmount,
          transactionId: paymentTxId,
          method: 'VNPAY_SANDBOX',
          invoiceId: invoice.id,
          userId: invoice.userId,
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      }),
    ]);

    await auditService.log({
      actorId: invoice.userId,
      actorName: invoice.user.fullName,
      actorRole: invoice.user.role,
      landlordId: invoice.landlordId,
      action: 'VNPAY_PAYMENT',
      entityType: 'Invoice',
      entityId: invoice.id,
      description: `${invoice.user.fullName} thanh toán hóa đơn "${invoice.title}" qua VNPay Sandbox: ${vnpAmount.toLocaleString('vi-VN')} đ`,
      metadata: { txnRef, transactionNo, status: newStatus },
    });

    return {
      rspCode: '00',
      message: 'Confirm Success',
      status: 'success',
      targetType: 'invoice',
      invoiceId,
      txnRef,
      transactionNo,
      responseCode,
      amount: vnpAmount,
    };
  }

  async processWebhook(payload: any) {
    const { transactionId, transferAmount, content } = payload;

    // 1. Idempotency Check (chống xử lý lặp giao dịch)
    if (transactionId) {
      const existingPayment = await prisma.payment.findFirst({
        where: { transactionId: transactionId.toString() },
      });
      if (existingPayment) {
        return { success: true, message: 'Giao dịch đã được xử lý trước đó.' };
      }
    }

    // 2. Trích xuất invoiceId từ nội dung chuyển khoản
    // Cú pháp quy định: "PAY <invoiceId>"
    const match = typeof content === 'string' ? content.match(/PAY\s+([a-zA-Z0-9-]+)/i) : null;
    if (!match || !match[1]) {
      return {
        success: false,
        message: 'Không tìm thấy cú pháp thanh toán hợp lệ (PAY {invoiceId}).',
      };
    }
    const invoiceId = match[1];

    // 3. Truy xuất hóa đơn
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { user: true },
    });

    if (!invoice) {
      return { success: false, message: 'Không tìm thấy hóa đơn.' };
    }

    // 4. Tính toán số tiền và trạng thái
    const amountPaid = parseFloat(transferAmount);

    // Tổng tiền đã thanh toán trước đó
    const previousPayments = await prisma.payment.findMany({
      where: { invoiceId: invoice.id },
    });
    const totalPaidBefore = previousPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaidNow = totalPaidBefore + amountPaid;

    let newStatus = invoice.status;
    if (totalPaidNow >= invoice.amount) {
      newStatus = 'PAID';
    } else if (totalPaidNow > 0) {
      newStatus = 'PARTIAL';
    }

    // 5. Cập nhật DB (Sử dụng Transaction để đảm bảo tính toàn vẹn)
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          amount: amountPaid,
          transactionId: transactionId ? transactionId.toString() : null,
          method: 'BANK_TRANSFER_IPN',
          invoiceId: invoice.id,
          userId: invoice.userId,
        },
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      }),
    ]);

    await auditService.log({
      actorId: invoice.userId,
      actorName: invoice.user.fullName,
      actorRole: invoice.user.role,
      landlordId: invoice.landlordId,
      action: 'WEBHOOK_PAYMENT',
      entityType: 'Invoice',
      entityId: invoice.id,
      description: `Thanh toán hóa đơn "${invoice.title}" qua IPN Webhook: ${amountPaid.toLocaleString('vi-VN')} đ (${newStatus})`,
      metadata: { transactionId, status: newStatus },
    });

    return {
      success: true,
      message: 'Gạch nợ tự động thành công.',
      data: { invoiceId, newStatus, amountPaid },
    };
  }
}
