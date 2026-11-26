import bcrypt from 'bcryptjs';
import prisma from '../../config/db';
import { AuthUser } from '../../middleware/auth.middleware';
import { auditService } from '../audit/audit.service';

export class ContractsService {
  // Giai đoạn Check-in: Tạo hợp đồng
  async createContract(data: any, reqUser: AuthUser) {
    const {
      room,
      tenant,
      phone,
      idCard,
      idCardFront,
      idCardBack,
      price,
      deposit,
      startDate,
      endDate,
      equipments,
      billingCycle,
    } = data;

    // 1. Find room scoped by landlord
    const roomRecord = await prisma.room.findFirst({
      where: {
        roomNumber: room,
        ...(reqUser.role === 'LANDLORD' ? { landlordId: reqUser.id } : {}),
      },
    });

    if (!roomRecord) {
      throw new Error(`Không tìm thấy phòng ${room} thuộc quyền quản lý của bạn.`);
    }

    const landlordId = roomRecord.landlordId ?? (reqUser.role === 'LANDLORD' ? reqUser.id : null);

    // 2. Find or create tenant
    let user = null;
    if (phone) {
      user = await prisma.user.findUnique({ where: { phone } });
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
          managedById: landlordId,
          email: `${phone || Date.now()}@smarthost.com`,
        },
      });
    } else {
      const updateUser: any = {};
      if (idCard) {
        updateUser.idCard = idCard;
        updateUser.idCardFront = idCardFront;
        updateUser.idCardBack = idCardBack;
      }
      if (!user.managedById && landlordId) {
        updateUser.managedById = landlordId;
      }
      if (Object.keys(updateUser).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateUser,
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
        isActive: true,
      },
      include: {
        user: true,
        room: true,
      },
    });

    // 4. Update room status
    await prisma.room.update({
      where: { id: roomRecord.id },
      data: { status: 'OCCUPIED' },
    });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId,
      action: 'CREATE_CONTRACT',
      entityType: 'Contract',
      entityId: contract.id,
      description: `${reqUser.fullName} đã tạo hợp đồng Phòng ${roomRecord.roomNumber} cho khách ${user.fullName}`,
    });

    return contract;
  }

  // Khách thuê ký hợp đồng (Check-in xác nhận)
  async signContract(contractId: string, reqUser: AuthUser) {
    const existing = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { room: true, user: true },
    });
    if (!existing) throw new Error('Contract not found');
    if (reqUser.role === 'TENANT' && existing.userId !== reqUser.id) {
      throw new Error('FORBIDDEN');
    }
    if (reqUser.role === 'LANDLORD' && existing.room.landlordId !== reqUser.id) {
      throw new Error('FORBIDDEN');
    }

    const updated = await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'ACTIVE' },
    });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: existing.room.landlordId,
      action: 'SIGN_CONTRACT',
      entityType: 'Contract',
      entityId: updated.id,
      description: `${reqUser.fullName} đã ký xác nhận hợp đồng Phòng ${existing.room.roomNumber}`,
    });

    return updated;
  }

  // Khách thuê tạo yêu cầu trả phòng (Check-out)
  async requestCheckOut(contractId: string, data: any, reqUser: AuthUser) {
    const { moveOutDate, reason, bankAccount } = data;

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { room: true },
    });
    if (!contract) throw new Error('Contract not found');
    if (reqUser.role === 'TENANT' && contract.userId !== reqUser.id) {
      throw new Error('FORBIDDEN');
    }
    if (reqUser.role === 'LANDLORD' && contract.room.landlordId !== reqUser.id) {
      throw new Error('FORBIDDEN');
    }

    const request = await prisma.checkOutRequest.create({
      data: {
        contractId,
        moveOutDate: new Date(moveOutDate),
        reason,
        bankAccount,
        status: 'PENDING',
      },
    });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: contract.room.landlordId,
      action: 'REQUEST_CHECKOUT',
      entityType: 'CheckOutRequest',
      entityId: request.id,
      description: `${reqUser.fullName} gửi yêu cầu trả Phòng ${contract.room.roomNumber}`,
    });

    return request;
  }

  // Chủ trọ duyệt và quyết toán Check-out
  async processCheckOut(requestId: string, data: any, reqUser: AuthUser) {
    const { refundAmount, deductions, deductionReason, isApproved } = data;

    const existingReq = await prisma.checkOutRequest.findUnique({
      where: { id: requestId },
      include: { contract: { include: { room: true, user: true } } },
    });
    if (!existingReq) throw new Error('Check-out request not found');
    if (
      reqUser.role === 'LANDLORD' &&
      existingReq.contract.room.landlordId !== reqUser.id
    ) {
      throw new Error('FORBIDDEN');
    }

    if (!isApproved) {
      const rejected = await prisma.checkOutRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });

      await auditService.log({
        actorId: reqUser.id,
        actorName: reqUser.fullName,
        actorRole: reqUser.role,
        landlordId: existingReq.contract.room.landlordId,
        action: 'REJECT_CHECKOUT',
        entityType: 'CheckOutRequest',
        entityId: rejected.id,
        description: `${reqUser.fullName} từ chối yêu cầu trả Phòng ${existingReq.contract.room.roomNumber}`,
      });

      return rejected;
    }

    const request = await prisma.checkOutRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        refundAmount: Number(refundAmount || 0),
        deductions: Number(deductions || 0),
        deductionReason,
      },
      include: { contract: true },
    });

    await prisma.contract.update({
      where: { id: request.contractId },
      data: {
        status: 'TERMINATED',
        isActive: false,
      },
    });

    await prisma.room.update({
      where: { id: request.contract.roomId },
      data: { status: 'AVAILABLE' },
    });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: existingReq.contract.room.landlordId,
      action: 'PROCESS_CHECKOUT',
      entityType: 'CheckOutRequest',
      entityId: request.id,
      description: `${reqUser.fullName} đã duyệt trả Phòng ${existingReq.contract.room.roomNumber}, hoàn cọc ${Number(refundAmount || 0).toLocaleString('vi-VN')} đ`,
    });

    return request;
  }

  async getAllContracts(reqUser: AuthUser) {
    const where =
      reqUser.role === 'LANDLORD'
        ? { room: { landlordId: reqUser.id } }
        : reqUser.role === 'TENANT'
          ? { userId: reqUser.id }
          : {};

    return prisma.contract.findMany({
      where,
      include: {
        room: true,
        user: true,
        checkOutRequest: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Cập nhật hợp đồng
  async updateContract(contractId: string, data: any, reqUser: AuthUser) {
    const {
      price,
      deposit,
      startDate,
      endDate,
      equipments,
      billingCycle,
      idCard,
      phone,
      tenant,
    } = data;

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { room: true },
    });
    if (!contract) throw new Error('Contract not found');
    if (reqUser.role === 'LANDLORD' && contract.room.landlordId !== reqUser.id) {
      throw new Error('FORBIDDEN');
    }

    const updateData: any = {};
    if (price !== undefined) updateData.price = Number(price);
    if (deposit !== undefined) updateData.deposit = Number(deposit);
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (equipments !== undefined) updateData.equipments = equipments;
    if (billingCycle !== undefined) updateData.billingCycle = Number(billingCycle);

    if (contract.userId) {
      const userUpdate: any = {};
      if (idCard !== undefined) userUpdate.idCard = idCard;
      if (phone !== undefined) userUpdate.phone = phone;
      if (tenant !== undefined) userUpdate.fullName = tenant;

      if (Object.keys(userUpdate).length > 0) {
        await prisma.user.update({
          where: { id: contract.userId },
          data: userUpdate,
        });
      }
    }

    const updated = await prisma.contract.update({
      where: { id: contractId },
      data: updateData,
      include: {
        room: true,
        user: true,
      },
    });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: contract.room.landlordId,
      action: 'UPDATE_CONTRACT',
      entityType: 'Contract',
      entityId: updated.id,
      description: `${reqUser.fullName} đã cập nhật hợp đồng Phòng ${contract.room.roomNumber}`,
    });

    return updated;
  }

  // Xóa hợp đồng
  async deleteContract(contractId: string, reqUser: AuthUser) {
    const existing = await prisma.contract.findUnique({
      where: { id: contractId },
      include: { room: true },
    });
    if (!existing) throw new Error('Contract not found');
    if (reqUser.role === 'LANDLORD' && existing.room.landlordId !== reqUser.id) {
      throw new Error('FORBIDDEN');
    }

    const request = await prisma.checkOutRequest.findUnique({
      where: { contractId },
    });
    if (request) {
      await prisma.checkOutRequest.delete({ where: { contractId } });
    }

    const contract = await prisma.contract.delete({
      where: { id: contractId },
      include: { room: true },
    });

    if (contract.roomId) {
      await prisma.room.update({
        where: { id: contract.roomId },
        data: { status: 'AVAILABLE' },
      });
    }

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: existing.room.landlordId,
      action: 'DELETE_CONTRACT',
      entityType: 'Contract',
      entityId: contractId,
      description: `${reqUser.fullName} đã xóa hợp đồng Phòng ${existing.room.roomNumber}`,
    });

    return contract;
  }
}
