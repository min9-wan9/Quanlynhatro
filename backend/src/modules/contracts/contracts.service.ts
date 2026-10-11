import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export class ContractsService {
  // Giai đoạn Check-in: Tạo hợp đồng
  async createContract(data: any) {
    const { room, tenant, phone, idCard, idCardFront, idCardBack, price, deposit, startDate, endDate, equipments, billingCycle } = data;

    // 1. Find room
    const roomRecord = await prisma.room.findUnique({
      where: { roomNumber: room }
    });

    if (!roomRecord) {
      throw new Error(`Room ${room} not found`);
    }

    // 2. Find or create tenant
    let user = null;
    if (phone) {
      user = await prisma.user.findUnique({
        where: { phone }
      });
    }

    if (!user) {
      const defaultPassword = await bcrypt.hash('123456', 10);
      user = await prisma.user.create({
        data: {
          fullName: tenant,
          phone: phone,
          idCard: idCard,
          idCardFront,
          idCardBack,
          password: defaultPassword,
          role: 'TENANT',
          email: `${phone || Date.now()}@smarthost.com`
        }
      });
    } else {
      // Cập nhật idCard nếu user đã tồn tại nhưng chưa có hoặc muốn đổi
      if (idCard) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { idCard, idCardFront, idCardBack }
        });
      }
    }

    // 3. Create contract
    const contract = await prisma.contract.create({
      data: {
        roomId: roomRecord.id,
        userId: user.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        price: Number(price),
        deposit: Number(deposit),
        billingCycle: Number(billingCycle) || 1,
        equipments: equipments,
        status: 'PENDING_SIGN',
        isActive: true
      },
      include: {
        user: true,
        room: true
      }
    });

    // 4. Update room status
    await prisma.room.update({
      where: { id: roomRecord.id },
      data: { status: 'OCCUPIED' }
    });

    return contract;
  }

  // Khách thuê ký hợp đồng (Check-in xác nhận)
  async signContract(contractId: string) {
    return await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'ACTIVE' }
    });
  }

  // Khách thuê tạo yêu cầu trả phòng (Check-out)
  async requestCheckOut(contractId: string, data: any) {
    const { moveOutDate, reason, bankAccount } = data;

    const contract = await prisma.contract.findUnique({
      where: { id: contractId }
    });
    if (!contract) throw new Error('Contract not found');

    const request = await prisma.checkOutRequest.create({
      data: {
        contractId,
        moveOutDate: new Date(moveOutDate),
        reason,
        bankAccount,
        status: 'PENDING'
      }
    });
    return request;
  }

  // Chủ trọ duyệt và quyết toán Check-out
  async processCheckOut(requestId: string, data: any) {
    const { refundAmount, deductions, deductionReason, isApproved } = data;

    if (!isApproved) {
      return await prisma.checkOutRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' }
      });
    }

    // 1. Cập nhật yêu cầu Check-out
    const request = await prisma.checkOutRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        refundAmount: Number(refundAmount || 0),
        deductions: Number(deductions || 0),
        deductionReason
      },
      include: { contract: true }
    });

    // 2. Chấm dứt hợp đồng
    await prisma.contract.update({
      where: { id: request.contractId },
      data: { 
        status: 'TERMINATED',
        isActive: false
      }
    });

    // 3. Đưa phòng về trạng thái trống
    await prisma.room.update({
      where: { id: request.contract.roomId },
      data: { status: 'AVAILABLE' } // Hoặc 'MAINTENANCE'
    });

    return request;
  }

  async getAllContracts() {
    return await prisma.contract.findMany({
      include: {
        room: true,
        user: true,
        checkOutRequest: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  // Cập nhật hợp đồng
  async updateContract(contractId: string, data: any) {
    const { price, deposit, startDate, endDate, equipments, billingCycle, idCard, phone, tenant } = data;
    
    const updateData: any = {};
    if (price !== undefined) updateData.price = Number(price);
    if (deposit !== undefined) updateData.deposit = Number(deposit);
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (equipments !== undefined) updateData.equipments = equipments;
    if (billingCycle !== undefined) updateData.billingCycle = Number(billingCycle);

    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (contract && contract.userId) {
      const userUpdate: any = {};
      if (idCard !== undefined) userUpdate.idCard = idCard;
      if (phone !== undefined) userUpdate.phone = phone;
      if (tenant !== undefined) userUpdate.fullName = tenant;
      
      if (Object.keys(userUpdate).length > 0) {
        await prisma.user.update({
          where: { id: contract.userId },
          data: userUpdate
        });
      }
    }

    return await prisma.contract.update({
      where: { id: contractId },
      data: updateData,
      include: {
        room: true,
        user: true
      }
    });
  }

  // Xóa hợp đồng
  async deleteContract(contractId: string) {
    // Nếu hợp đồng đã có CheckOutRequest thì xóa request trước (do constraint)
    const request = await prisma.checkOutRequest.findUnique({
      where: { contractId }
    });
    if (request) {
      await prisma.checkOutRequest.delete({ where: { contractId } });
    }

    const contract = await prisma.contract.delete({
      where: { id: contractId },
      include: { room: true }
    });

    // Chuyển phòng về trạng thái trống
    if (contract.roomId) {
      await prisma.room.update({
        where: { id: contract.roomId },
        data: { status: 'AVAILABLE' }
      });
    }

    return contract;
  }
}
