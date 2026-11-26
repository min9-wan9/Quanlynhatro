import bcrypt from 'bcryptjs';
import prisma from '../../config/db';
import { AuthUser } from '../../middleware/auth.middleware';
import { JwtRole, signJwt } from '../../utils/jwt';
import { auditService } from '../audit/audit.service';

export class UsersService {
  async getAllTenants(reqUser: AuthUser) {
    const whereClause =
      reqUser.role === 'LANDLORD'
        ? {
            role: 'TENANT' as const,
            OR: [
              { managedById: reqUser.id },
              { contracts: { some: { room: { landlordId: reqUser.id } } } },
            ],
          }
        : { role: 'TENANT' as const };

    return prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        idCard: true,
        walletBalance: true,
        isAutoPay: true,
        isActive: true,
        role: true,
        managedById: true,
        createdAt: true,
        contracts: {
          ...(reqUser.role === 'LANDLORD'
            ? { where: { room: { landlordId: reqUser.id } } }
            : {}),
          include: { room: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllLandlords() {
    const landlords = await prisma.user.findMany({
      where: { role: 'LANDLORD' },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            ownedRooms: true,
            tenants: true,
            landlordInvoices: true,
            activityLogs: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Count active occupied rooms & tenants per landlord
    const activeContracts = await prisma.contract.findMany({
      where: { isActive: true, room: { landlordId: { not: null } } },
      select: {
        userId: true,
        room: { select: { landlordId: true } },
      },
    });

    const tenantSetByLandlord = new Map<string, Set<string>>();
    for (const c of activeContracts) {
      const lid = c.room.landlordId;
      if (!lid) continue;
      if (!tenantSetByLandlord.has(lid)) tenantSetByLandlord.set(lid, new Set());
      tenantSetByLandlord.get(lid)!.add(c.userId);
    }

    return landlords.map((l) => ({
      ...l,
      activeTenantCount: tenantSetByLandlord.get(l.id)?.size ?? l._count.tenants,
    }));
  }

  async createLandlord(
    data: { fullName: string; email: string; phone?: string; password: string },
    actor: AuthUser
  ) {
    const email = data.email?.trim();
    const fullName = data.fullName?.trim();
    const phone = data.phone?.trim() || null;
    if (!email || !fullName || !data.password) {
      throw new Error('Vui lòng nhập đầy đủ họ tên, email và mật khẩu.');
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
      },
    });
    if (existing) {
      throw new Error('Email hoặc số điện thoại đã tồn tại trong hệ thống.');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const landlord = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        password: hashedPassword,
        role: 'LANDLORD',
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await auditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      landlordId: landlord.id,
      action: 'CREATE_LANDLORD',
      entityType: 'User',
      entityId: landlord.id,
      description: `Admin ${actor.fullName} đã tạo tài khoản Chủ trọ: ${landlord.fullName} (${landlord.email})`,
    });

    return landlord;
  }

  async toggleLandlordStatus(id: string, isActive: boolean, actor: AuthUser) {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== 'LANDLORD') {
      throw new Error('Không tìm thấy tài khoản Chủ trọ.');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    await auditService.log({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      landlordId: updated.id,
      action: isActive ? 'UNLOCK_LANDLORD' : 'LOCK_LANDLORD',
      entityType: 'User',
      entityId: updated.id,
      description: `Admin ${actor.fullName} đã ${isActive ? 'mở khóa' : 'khóa'} tài khoản Chủ trọ ${updated.fullName}`,
    });

    return updated;
  }

  async getUserById(id: string, reqUser: AuthUser) {
    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        idCard: true,
        walletBalance: true,
        isAutoPay: true,
        isActive: true,
        managedById: true,
        contracts: {
          select: { room: { select: { landlordId: true } } },
        },
      },
    });

    if (!target) return null;

    if (reqUser.role === 'TENANT' && target.id !== reqUser.id) {
      throw new Error('FORBIDDEN');
    }
    if (reqUser.role === 'LANDLORD' && target.id !== reqUser.id) {
      const belongsToLandlord =
        target.managedById === reqUser.id ||
        target.contracts.some((c) => c.room.landlordId === reqUser.id);
      if (!belongsToLandlord) {
        throw new Error('FORBIDDEN');
      }
    }

    const { contracts: _c, ...safeUser } = target;
    return safeUser;
  }

  async createTenant(data: any, reqUser: AuthUser) {
    const rawPassword = data.password?.trim() || '123456';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const managedById =
      reqUser.role === 'LANDLORD' ? reqUser.id : data.landlordId || null;

    const tenant = await prisma.user.create({
      data: {
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || `${data.phone || Date.now()}@example.com`,
        password: hashedPassword,
        role: 'TENANT',
        managedById,
      },
    });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: managedById,
      action: 'CREATE_TENANT',
      entityType: 'User',
      entityId: tenant.id,
      description: `${reqUser.fullName} đã tạo tài khoản khách thuê ${tenant.fullName} (${tenant.phone || tenant.email})`,
    });

    return tenant;
  }

  async updateTenant(id: string, data: any, reqUser: AuthUser) {
    const existing = await prisma.user.findUnique({
      where: { id },
      include: { contracts: { include: { room: true } } },
    });
    if (!existing) throw new Error('Không tìm thấy người dùng.');

    if (reqUser.role === 'TENANT' && existing.id !== reqUser.id) {
      throw new Error('FORBIDDEN');
    }
    if (reqUser.role === 'LANDLORD' && existing.id !== reqUser.id) {
      const owns =
        existing.managedById === reqUser.id ||
        existing.contracts.some((c) => c.room.landlordId === reqUser.id);
      if (!owns) throw new Error('FORBIDDEN');
    }

    const updateData: any = {};
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.isAutoPay !== undefined) updateData.isAutoPay = data.isAutoPay;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        isAutoPay: true,
        walletBalance: true,
      },
    });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId:
        reqUser.role === 'LANDLORD' ? reqUser.id : existing.managedById ?? null,
      action: 'UPDATE_TENANT',
      entityType: 'User',
      entityId: updated.id,
      description: `${reqUser.fullName} đã cập nhật thông tin tài khoản ${updated.fullName}`,
    });

    return updated;
  }

  async assignRoom(userId: string, roomId: string, reqUser: AuthUser) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new Error('Room not found');
    if (reqUser.role === 'LANDLORD' && room.landlordId !== reqUser.id) {
      throw new Error('FORBIDDEN');
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    await prisma.contract.create({
      data: {
        userId,
        roomId,
        startDate,
        endDate,
        deposit: room.price,
      },
    });

    return prisma.room.update({
      where: { id: roomId },
      data: { status: 'OCCUPIED' },
    });
  }

  async login(identifier: string, password: string, role?: string, ipAddress?: string) {
    const roleFilter =
      role === 'MANAGEMENT' || role === 'ADMIN'
        ? { in: ['ADMIN', 'LANDLORD'] as JwtRole[] }
        : role === 'TENANT'
          ? 'TENANT'
          : undefined;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: identifier }, { email: identifier }],
        ...(roleFilter ? { role: roleFilter as any } : {}),
      },
      include: {
        contracts: {
          include: { room: true },
          where: { isActive: true },
        },
      },
    });

    if (!user) {
      throw new Error('Sai thông tin đăng nhập.');
    }

    let isMatch = user.password === password;
    if (!isMatch) {
      try {
        isMatch = await bcrypt.compare(password, user.password);
      } catch {
        isMatch = false;
      }
    }

    if (!isMatch) {
      throw new Error('Sai thông tin đăng nhập.');
    }

    if (!user.isActive) {
      throw new Error('Tài khoản đã bị khóa. Vui lòng liên hệ Quản trị viên.');
    }

    const token = signJwt({
      userId: user.id,
      role: user.role as JwtRole,
      fullName: user.fullName,
    });

    await auditService.log({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      landlordId: user.role === 'LANDLORD' ? user.id : user.managedById ?? null,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      description: `${user.fullName} (${user.role}) đã đăng nhập hệ thống`,
      ipAddress,
    });

    const { password: _pwd, ...safeUser } = user;
    return {
      user: {
        ...safeUser,
        name: user.fullName,
      },
      token,
    };
  }

  async changePassword(userId: string, oldPass: string, newPass: string, reqUser: AuthUser) {
    if (reqUser.role !== 'ADMIN' && reqUser.id !== userId) {
      throw new Error('FORBIDDEN');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Không tìm thấy người dùng');

    let isMatch = user.password === oldPass;
    if (!isMatch) {
      try {
        isMatch = await bcrypt.compare(oldPass, user.password);
      } catch {
        isMatch = false;
      }
    }

    if (!isMatch) throw new Error('Mật khẩu cũ không chính xác');

    const hashedNewPass = await bcrypt.hash(newPass, 10);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPass },
    });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: user.role === 'LANDLORD' ? user.id : user.managedById ?? null,
      action: 'CHANGE_PASSWORD',
      entityType: 'User',
      entityId: user.id,
      description: `${user.fullName} đã đổi mật khẩu tài khoản`,
    });

    return updated;
  }
}
