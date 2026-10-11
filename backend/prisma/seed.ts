import { PrismaClient, Role, RoomStatus, InvoiceStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('Dữ liệu đã tồn tại, bỏ qua quá trình seed.');
    return;
  }

  console.log('Bắt đầu dọn dẹp dữ liệu cũ...');
  // Xóa theo thứ tự ràng buộc khóa ngoại
  await prisma.issueReport.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.utilityReading.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  console.log('Tạo Users...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@nhatro.com',
      phone: '0901234567',
      password: 'hashed_password', // Thực tế nên bcrypt
      fullName: 'Chủ Trọ Admin',
      role: Role.ADMIN,
    },
  });

  const tenant1 = await prisma.user.create({
    data: {
      email: 'tenant1@gmail.com',
      phone: '0911111111',
      password: '123',
      fullName: 'Khách Thuê 1',
      role: Role.TENANT,
    },
  });

  const tenant2 = await prisma.user.create({
    data: {
      email: 'tenant2@gmail.com',
      phone: '0922222222',
      password: '123',
      fullName: 'Khách Thuê 2',
      role: Role.TENANT,
    },
  });

  console.log('Tạo Rooms...');
  const room1 = await prisma.room.create({
    data: { roomNumber: '101', price: 3000000, area: 20, status: RoomStatus.OCCUPIED },
  });
  const room2 = await prisma.room.create({
    data: { roomNumber: '102', price: 3500000, area: 25, status: RoomStatus.OCCUPIED },
  });
  const room3 = await prisma.room.create({
    data: { roomNumber: '103', price: 2500000, area: 15, status: RoomStatus.OCCUPIED },
  });
  const room4 = await prisma.room.create({
    data: { roomNumber: '201', price: 3000000, area: 20, status: RoomStatus.AVAILABLE },
  });
  const room5 = await prisma.room.create({
    data: { roomNumber: '202', price: 3500000, area: 25, status: RoomStatus.AVAILABLE },
  });

  console.log('Tạo Contracts...');
  await prisma.contract.create({
    data: {
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-10-01'),
      deposit: 3000000,
      userId: tenant1.id,
      roomId: room1.id,
    }
  });

  await prisma.contract.create({
    data: {
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-10-01'),
      deposit: 3500000,
      userId: tenant2.id,
      roomId: room2.id,
    }
  });

  console.log('Tạo Invoices...');
  // Cố định ID của Hóa đơn đang nợ để lát nữa test Webhook dễ dàng
  const pendingInvoiceId = 'inv-test-pending-123';
  await prisma.invoice.create({
    data: {
      id: pendingInvoiceId,
      title: 'Tiền phòng tháng 10 - P101',
      amount: 3000000,
      status: InvoiceStatus.PENDING, // UNPAID
      dueDate: new Date('2026-10-05'),
      userId: tenant1.id,
    }
  });

  const paidInvoice = await prisma.invoice.create({
    data: {
      title: 'Tiền phòng tháng 10 - P102',
      amount: 3500000,
      status: InvoiceStatus.PAID,
      dueDate: new Date('2026-10-05'),
      userId: tenant2.id,
    }
  });

  // Tạo payment log cho hóa đơn đã thanh toán
  await prisma.payment.create({
    data: {
      amount: 3500000,
      transactionId: 'TXN_TEST_001',
      method: 'CASH',
      invoiceId: paidInvoice.id,
      userId: tenant2.id,
    }
  });

  console.log('Seed thành công! Dữ liệu mẫu đã được nạp.');
  console.log(`>>> Hóa đơn cần dùng để test Webhook: ${pendingInvoiceId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
