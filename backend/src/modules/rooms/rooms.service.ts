import { Prisma } from '@prisma/client';
import prisma from '../../config/db';
import { AuthUser } from '../../middleware/auth.middleware';
import { auditService } from '../audit/audit.service';

export class RoomsService {
  async getAllRooms(reqUser: AuthUser) {
    const where: Prisma.RoomWhereInput =
      reqUser.role === 'LANDLORD' ? { landlordId: reqUser.id } : {};

    return prisma.room.findMany({
      where,
      include: {
        contracts: {
          where: { isActive: true },
          include: { user: true },
        },
        utilityReadings: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 2,
        },
      },
      orderBy: { roomNumber: 'asc' },
    });
  }

  async getRoomById(id: string, reqUser: AuthUser) {
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        utilityReadings: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        },
        contracts: true,
      },
    });

    if (!room) return null;

    if (reqUser.role === 'LANDLORD' && room.landlordId !== reqUser.id) {
      throw new Error('FORBIDDEN');
    }
    if (reqUser.role === 'TENANT') {
      const hasContract = room.contracts.some((c) => c.userId === reqUser.id);
      if (!hasContract) throw new Error('FORBIDDEN');
    }

    return room;
  }

  async createRoom(data: any, reqUser: AuthUser) {
    const landlordId =
      reqUser.role === 'LANDLORD' ? reqUser.id : data.landlordId || null;

    const existing = await prisma.room.findFirst({
      where: { landlordId, roomNumber: data.roomNumber },
    });
    if (existing) {
      throw new Error(`Phòng ${data.roomNumber} đã tồn tại trong danh sách của bạn.`);
    }

    const room = await prisma.room.create({
      data: {
        roomNumber: data.roomNumber,
        price: Number(data.price),
        area: data.area !== undefined ? Number(data.area) : null,
        status: data.status || 'AVAILABLE',
        description: data.description || null,
        landlordId,
      },
    });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId,
      action: 'CREATE_ROOM',
      entityType: 'Room',
      entityId: room.id,
      description: `${reqUser.fullName} đã tạo Phòng ${room.roomNumber} (${room.price.toLocaleString('vi-VN')} đ)`,
    });

    return room;
  }

  async updateRoom(id: string, data: any, reqUser: AuthUser) {
    const existing = await prisma.room.findUnique({ where: { id } });
    if (!existing) throw new Error('Room not found');
    if (reqUser.role === 'LANDLORD' && existing.landlordId !== reqUser.id) {
      throw new Error('FORBIDDEN');
    }

    const updateData: Prisma.RoomUpdateInput = {};
    if (data.roomNumber !== undefined) updateData.roomNumber = data.roomNumber;
    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.area !== undefined) updateData.area = Number(data.area);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.description !== undefined) updateData.description = data.description;

    const updated = await prisma.room.update({ where: { id }, data: updateData });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: existing.landlordId,
      action: 'UPDATE_ROOM',
      entityType: 'Room',
      entityId: updated.id,
      description: `${reqUser.fullName} đã cập nhật Phòng ${updated.roomNumber} (Trạng thái: ${updated.status})`,
    });

    return updated;
  }

  async deleteRoom(id: string, reqUser: AuthUser) {
    const existing = await prisma.room.findUnique({ where: { id } });
    if (!existing) throw new Error('Room not found');
    if (reqUser.role === 'LANDLORD' && existing.landlordId !== reqUser.id) {
      throw new Error('FORBIDDEN');
    }

    const deleted = await prisma.room.delete({ where: { id } });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: existing.landlordId,
      action: 'DELETE_ROOM',
      entityType: 'Room',
      entityId: id,
      description: `${reqUser.fullName} đã xóa Phòng ${existing.roomNumber}`,
    });

    return deleted;
  }

  async saveUtilityReading(
    roomId: string,
    data: { month: number; year: number; waterNumber: number; powerNumber: number },
    reqUser: AuthUser
  ) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new Error('Room not found');
    if (reqUser.role === 'LANDLORD' && room.landlordId !== reqUser.id) {
      throw new Error('FORBIDDEN');
    }

    const existing = await prisma.utilityReading.findFirst({
      where: { roomId, month: data.month, year: data.year },
    });

    const reading = existing
      ? await prisma.utilityReading.update({
          where: { id: existing.id },
          data: { waterNumber: data.waterNumber, powerNumber: data.powerNumber },
        })
      : await prisma.utilityReading.create({
          data: {
            roomId,
            month: data.month,
            year: data.year,
            waterNumber: data.waterNumber,
            powerNumber: data.powerNumber,
          },
        });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: room.landlordId,
      action: 'RECORD_UTILITY',
      entityType: 'UtilityReading',
      entityId: reading.id,
      description: `${reqUser.fullName} chốt điện nước Phòng ${room.roomNumber} (T${data.month}/${data.year}): Điện ${data.powerNumber}, Nước ${data.waterNumber}`,
    });

    return reading;
  }
}
