import { PrismaClient, Role, RoomStatus, InvoiceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    const landlordCount = await prisma.user.count({ where: { role: Role.LANDLORD } });
    if (landlordCount > 0) {
      console.log('Dữ liệu đa chủ trọ đã tồn tại, bỏ qua quá trình seed.');
      return;
    }

    console.log('Phát hiện dữ liệu cũ: đang nâng cấp lên mô hình đa Chủ trọ...');
    const hashed123456 = await bcrypt.hash('123456', 10);

    const landlord1 = await prisma.user.upsert({
      where: { email: 'chutro1@nhatro.com' },
      update: {},
      create: {
        email: 'chutro1@nhatro.com',
        phone: '0908888111',
        password: hashed123456,
        fullName: 'Chủ Trọ Minh Anh',
        role: Role.LANDLORD,
        isActive: true,
      },
    });

    const landlord2 = await prisma.user.upsert({
      where: { email: 'chutro2@nhatro.com' },
      update: {},
      create: {
        email: 'chutro2@nhatro.com',
        phone: '0908888222',
        password: hashed123456,
        fullName: 'Chủ Trọ Hoàng Nam',
        role: Role.LANDLORD,
        isActive: true,
      },
    });

    await prisma.room.updateMany({
      where: { landlordId: null },
      data: { landlordId: landlord1.id },
    });
    await prisma.user.updateMany({
      where: { role: Role.TENANT, managedById: null },
      data: { managedById: landlord1.id },
    });
    await prisma.invoice.updateMany({
      where: { landlordId: null },
      data: { landlordId: landlord1.id },
    });
    await prisma.issueReport.updateMany({
      where: { landlordId: null },
      data: { landlordId: landlord1.id },
    });

    const existingTenant3 = await prisma.user.findUnique({ where: { phone: '0933333333' } });
    if (!existingTenant3) {
      const tenant3 = await prisma.user.create({
        data: {
          email: 'tenant3@gmail.com',
          phone: '0933333333',
          password: '123',
          fullName: 'Khách Thuê 3 (Trọ Nam)',
          role: Role.TENANT,
          managedById: landlord2.id,
        },
      });
      const l2Room1 = await prisma.room.create({
        data: {
          roomNumber: '101',
          price: 4000000,
          area: 26,
          status: RoomStatus.OCCUPIED,
          landlordId: landlord2.id,
        },
      });
      await prisma.room.create({
        data: {
          roomNumber: '301',
          price: 4200000,
          area: 28,
          status: RoomStatus.AVAILABLE,
          landlordId: landlord2.id,
        },
      });
      await prisma.contract.create({
        data: {
          startDate: new Date('2026-10-01'),
          endDate: new Date('2027-10-01'),
          price: 4000000,
          deposit: 4000000,
          userId: tenant3.id,
          roomId: l2Room1.id,
          status: 'ACTIVE',
        },
      });
      await prisma.invoice.create({
        data: {
          title: 'Tiền phòng tháng 11 - P101 (Trọ Hoàng Nam)',
          amount: 4000000,
          roomPrice: 4000000,
          status: InvoiceStatus.PENDING,
          dueDate: new Date('2026-12-05'),
          userId: tenant3.id,
          landlordId: landlord2.id,
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        actorName: 'Hệ thống',
        actorRole: 'ADMIN',
        action: 'SYSTEM_UPGRADE',
        entityType: 'System',
        description: 'Nâng cấp dữ liệu sang mô hình phân quyền Admin + Nhiều Chủ trọ độc lập',
      },
    });

    console.log('Nâng cấp dữ liệu đa chủ trọ hoàn tất!');
    return;
  }

  console.log('Bắt đầu khởi tạo dữ liệu mẫu...');
  const hashed123456 = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@nhatro.com',
      phone: '0901234567',
      password: 'hashed_password',
      fullName: 'Quản Trị Hệ Thống',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const landlord1 = await prisma.user.create({
    data: {
      email: 'chutro1@nhatro.com',
      phone: '0908888111',
      password: hashed123456,
      fullName: 'Chủ Trọ Minh Anh',
      role: Role.LANDLORD,
      isActive: true,
    },
  });

  const landlord2 = await prisma.user.create({
    data: {
      email: 'chutro2@nhatro.com',
      phone: '0908888222',
      password: hashed123456,
      fullName: 'Chủ Trọ Hoàng Nam',
      role: Role.LANDLORD,
      isActive: true,
    },
  });

  // Tenants thuộc Chủ trọ 1
  const tenant1 = await prisma.user.create({
    data: {
      email: 'tenant1@gmail.com',
      phone: '0911111111',
      password: '123',
      fullName: 'Khách Thuê 1',
      role: Role.TENANT,
      managedById: landlord1.id,
    },
  });

  const tenant2 = await prisma.user.create({
    data: {
      email: 'tenant2@gmail.com',
      phone: '0922222222',
      password: '123',
      fullName: 'Khách Thuê 2',
      role: Role.TENANT,
      managedById: landlord1.id,
    },
  });

  // Tenant thuộc Chủ trọ 2
  const tenant3 = await prisma.user.create({
    data: {
      email: 'tenant3@gmail.com',
      phone: '0933333333',
      password: '123',
      fullName: 'Khách Thuê 3 (Trọ Nam)',
      role: Role.TENANT,
      managedById: landlord2.id,
    },
  });

  // Phòng của Chủ trọ 1
  const l1Room1 = await prisma.room.create({
    data: {
      roomNumber: '101',
      price: 3000000,
      area: 20,
      status: RoomStatus.OCCUPIED,
      landlordId: landlord1.id,
    },
  });
  const l1Room2 = await prisma.room.create({
    data: {
      roomNumber: '102',
      price: 3500000,
      area: 25,
      status: RoomStatus.OCCUPIED,
      landlordId: landlord1.id,
    },
  });
  await prisma.room.create({
    data: {
      roomNumber: '201',
      price: 3000000,
      area: 20,
      status: RoomStatus.AVAILABLE,
      landlordId: landlord1.id,
    },
  });

  // Phòng của Chủ trọ 2 (cũng có số phòng 101, 102 riêng biệt)
  const l2Room1 = await prisma.room.create({
    data: {
      roomNumber: '101',
      price: 4000000,
      area: 26,
      status: RoomStatus.OCCUPIED,
      landlordId: landlord2.id,
    },
  });
  await prisma.room.create({
    data: {
      roomNumber: '102',
      price: 4200000,
      area: 28,
      status: RoomStatus.AVAILABLE,
      landlordId: landlord2.id,
    },
  });

  // Hợp đồng
  await prisma.contract.create({
    data: {
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-10-01'),
      price: 3000000,
      deposit: 3000000,
      userId: tenant1.id,
      roomId: l1Room1.id,
      status: 'ACTIVE',
    },
  });

  await prisma.contract.create({
    data: {
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-10-01'),
      price: 3500000,
      deposit: 3500000,
      userId: tenant2.id,
      roomId: l1Room2.id,
      status: 'ACTIVE',
    },
  });

  await prisma.contract.create({
    data: {
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-10-01'),
      price: 4000000,
      deposit: 4000000,
      userId: tenant3.id,
      roomId: l2Room1.id,
      status: 'ACTIVE',
    },
  });

  // Hóa đơn
  const pendingInvoiceId = 'inv-test-pending-123';
  await prisma.invoice.create({
    data: {
      id: pendingInvoiceId,
      title: 'Tiền phòng tháng 10 - P101',
      amount: 3000000,
      roomPrice: 3000000,
      status: InvoiceStatus.PENDING,
      dueDate: new Date('2026-10-05'),
      userId: tenant1.id,
      landlordId: landlord1.id,
    },
  });

  const paidInvoice = await prisma.invoice.create({
    data: {
      title: 'Tiền phòng tháng 10 - P102',
      amount: 3500000,
      roomPrice: 3500000,
      status: InvoiceStatus.PAID,
      dueDate: new Date('2026-10-05'),
      userId: tenant2.id,
      landlordId: landlord1.id,
    },
  });

  await prisma.payment.create({
    data: {
      amount: 3500000,
      transactionId: 'TXN_TEST_001',
      method: 'CASH',
      invoiceId: paidInvoice.id,
      userId: tenant2.id,
    },
  });

  await prisma.invoice.create({
    data: {
      title: 'Tiền phòng tháng 11 - P101 (Trọ Hoàng Nam)',
      amount: 4000000,
      roomPrice: 4000000,
      status: InvoiceStatus.PENDING,
      dueDate: new Date('2026-12-05'),
      userId: tenant3.id,
      landlordId: landlord2.id,
    },
  });

  // Nhật ký mẫu ban đầu
  await prisma.activityLog.createMany({
    data: [
      {
        actorId: admin.id,
        actorName: admin.fullName,
        actorRole: 'ADMIN',
        action: 'CREATE_LANDLORD',
        entityType: 'User',
        entityId: landlord1.id,
        landlordId: landlord1.id,
        description: `Admin ${admin.fullName} đã tạo tài khoản Chủ trọ: ${landlord1.fullName}`,
      },
      {
        actorId: landlord1.id,
        actorName: landlord1.fullName,
        actorRole: 'LANDLORD',
        action: 'CREATE_ROOM',
        entityType: 'Room',
        entityId: l1Room1.id,
        landlordId: landlord1.id,
        description: `${landlord1.fullName} đã tạo Phòng 101 (3.000.000 đ)`,
      },
      {
        actorId: landlord2.id,
        actorName: landlord2.fullName,
        actorRole: 'LANDLORD',
        action: 'CREATE_ROOM',
        entityType: 'Room',
        entityId: l2Room1.id,
        landlordId: landlord2.id,
        description: `${landlord2.fullName} đã tạo Phòng 101 (4.000.000 đ)`,
      },
    ],
  });

  console.log('Seed thành công! Dữ liệu mẫu Admin + 2 Chủ trọ đã được nạp.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
