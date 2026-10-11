import prisma from '../../config/db';

export class PaymentsService {
  async processWebhook(payload: any) {
    const { transactionId, transferAmount, content } = payload;

    // 1. Idempotency Check (chống xử lý lặp giao dịch)
    if (transactionId) {
      const existingPayment = await prisma.payment.findFirst({
        where: { transactionId: transactionId.toString() }
      });
      if (existingPayment) {
        return { success: true, message: 'Giao dịch đã được xử lý trước đó.' };
      }
    }

    // 2. Trích xuất invoiceId từ nội dung chuyển khoản
    // Cú pháp quy định: "PAY <invoiceId>"
    const match = content.match(/PAY\s+([a-zA-Z0-9-]+)/i);
    if (!match) {
      // Lưu lại log hoặc xử lý thủ công đối với các khoản chuyển khoản sai cú pháp
      return { success: false, message: 'Không tìm thấy cú pháp thanh toán hợp lệ (PAY {invoiceId}).' };
    }
    const invoiceId = match[1];

    // 3. Truy xuất hóa đơn
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });

    if (!invoice) {
      return { success: false, message: 'Không tìm thấy hóa đơn.' };
    }

    // 4. Tính toán số tiền và trạng thái
    const amountPaid = parseFloat(transferAmount);
    
    // Tổng tiền đã thanh toán trước đó
    const previousPayments = await prisma.payment.findMany({
      where: { invoiceId: invoice.id }
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
          userId: invoice.userId // Liên kết với user sở hữu hóa đơn
        }
      }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus }
      })
    ]);

    return { success: true, message: 'Gạch nợ tự động thành công.', data: { invoiceId, newStatus, amountPaid } };
  }
}
