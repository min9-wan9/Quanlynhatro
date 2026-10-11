import prisma from '../../config/db';
import { Prisma } from '@prisma/client';

export class RoomsService {
  async getAllRooms() {
    return prisma.room.findMany({
      include: {
        contracts: {
          where: { isActive: true },
          include: { user: true }
        },
        utilityReadings: {
          orderBy: [
            { year: 'desc' },
            { month: 'desc' }
          ],
          take: 2
        }
      }
    });
  }

  async getRoomById(id: string) {
    return prisma.room.findUnique({ 
      where: { id },
      include: {
        utilityReadings: {
          orderBy: [
            { year: 'desc' },
            { month: 'desc' }
          ]
        },
        contracts: true
      }
    });
  }

  async createRoom(data: Prisma.RoomCreateInput) {
    return prisma.room.create({ data });
  }

  async updateRoom(id: string, data: Prisma.RoomUpdateInput) {
    return prisma.room.update({ where: { id }, data });
  }

  async deleteRoom(id: string) {
    return prisma.room.delete({ where: { id } });
  }

  async saveUtilityReading(roomId: string, data: { month: number, year: number, waterNumber: number, powerNumber: number }) {
    const existing = await prisma.utilityReading.findFirst({
      where: { roomId, month: data.month, year: data.year }
    });
    
    if (existing) {
      return prisma.utilityReading.update({
        where: { id: existing.id },
        data: { waterNumber: data.waterNumber, powerNumber: data.powerNumber }
      });
    }
    
    return prisma.utilityReading.create({
      data: {
        roomId,
        month: data.month,
        year: data.year,
        waterNumber: data.waterNumber,
        powerNumber: data.powerNumber
      }
    });
  }
}
