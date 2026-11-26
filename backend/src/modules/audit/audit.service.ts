import { Prisma } from '@prisma/client';
import prisma from '../../config/db';

export interface LogActivityInput {
  actorId?: string | undefined;
  actorName: string;
  actorRole: string;
  landlordId?: string | null | undefined;
  action: string;
  entityType: string;
  entityId?: string | null | undefined;
  description: string;
  metadata?: Record<string, unknown> | undefined;
  ipAddress?: string | undefined;
}

export interface AuditLogFilter {
  actorId?: string | undefined;
  landlordId?: string | undefined;
  action?: string | undefined;
  search?: string | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export class AuditService {
  async log(input: LogActivityInput): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          actorId: input.actorId ?? null,
          actorName: input.actorName,
          actorRole: input.actorRole,
          landlordId: input.landlordId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          description: input.description,
          metadata: input.metadata
            ? (input.metadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          ipAddress: input.ipAddress ?? null,
        },
      });
    } catch (error) {
      console.warn('ActivityLog write failed:', error);
    }
  }

  async getLogs(filter: AuditLogFilter) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 25));
    const skip = (page - 1) * limit;

    const where: Prisma.ActivityLogWhereInput = {};

    if (filter.actorId) where.actorId = filter.actorId;
    if (filter.landlordId) where.landlordId = filter.landlordId;
    if (filter.action) where.action = filter.action;

    if (filter.search?.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { actorName: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
        { entityType: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filter.fromDate || filter.toDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filter.fromDate) {
        const d = new Date(filter.fromDate);
        if (!Number.isNaN(d.getTime())) createdAt.gte = d;
      }
      if (filter.toDate) {
        const d = new Date(filter.toDate);
        if (!Number.isNaN(d.getTime())) {
          d.setHours(23, 59, 59, 999);
          createdAt.lte = d;
        }
      }
      if (Object.keys(createdAt).length > 0) {
        where.createdAt = createdAt;
      }
    }

    const [logs, total, totalAll, distinctActions] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
      prisma.activityLog.count(),
      prisma.activityLog.findMany({
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
      }),
    ]);

    return {
      logs,
      total,
      totalAll,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      actions: distinctActions.map((a) => a.action),
    };
  }
}

export const auditService = new AuditService();
