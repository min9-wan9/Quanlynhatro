import prisma from '../../config/db';

export class UsersService {
  async getAllTenants() {
    return prisma.user.findMany({
      where: { role: 'TENANT' },
      include: { contracts: { include: { room: true } } }
    });
  }

  async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        walletBalance: true,
        isAutoPay: true
      }
    });
  }

  async createTenant(data: any) {
    return prisma.user.create({
      data: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || `${data.phone}@example.com`,
        password: data.password,
        role: 'TENANT'
      }
    });
  }

  async updateTenant(id: string, data: any) {
    return prisma.user.update({
      where: { id },
      data: {
        fullName: data.fullName !== undefined ? data.fullName : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
        password: data.password || undefined,
        isAutoPay: data.isAutoPay !== undefined ? data.isAutoPay : undefined
      }
    });
  }

  async assignRoom(userId: string, roomId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new Error('Room not found');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    await prisma.contract.create({
      data: {
        userId,
        roomId,
        startDate,
        endDate,
        deposit: room.price
      }
    });

    return prisma.room.update({
      where: { id: roomId },
      data: { status: 'OCCUPIED' }
    });
  }

  async login(identifier: string, password: string, role: string) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: identifier }
        ],
        password,
        role: role as any
      },
      include: {
        contracts: {
          include: { room: true },
          where: { isActive: true }
        }
      }
    });

    if (!user) {
      // Thử tìm theo bcrypt nếu không match plain text
      const userRaw = await prisma.user.findFirst({
        where: {
          OR: [{ phone: identifier }, { email: identifier }],
          role: role as any
        },
        include: { contracts: { include: { room: true }, where: { isActive: true } } }
      });
      if (!userRaw) throw new Error('Sai thông tin đăng nhập.');
      
      const bcrypt = require('bcryptjs');
      const isMatch = await bcrypt.compare(password, userRaw.password);
      if (!isMatch) throw new Error('Sai thông tin đăng nhập.');
      return userRaw;
    }
    return user;
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Không tìm thấy người dùng');

    // So sánh mật khẩu cũ (hỗ trợ cả plain text lẫn bcrypt)
    let isMatch = false;
    if (user.password === oldPass) {
      isMatch = true;
    } else {
      const bcrypt = require('bcryptjs');
      try {
        isMatch = await bcrypt.compare(oldPass, user.password);
      } catch (e) {
        isMatch = false;
      }
    }

    if (!isMatch) throw new Error('Mật khẩu cũ không chính xác');

    const bcrypt = require('bcryptjs');
    const hashedNewPass = await bcrypt.hash(newPass, 10);
    
    return prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPass }
    });
  }
}
