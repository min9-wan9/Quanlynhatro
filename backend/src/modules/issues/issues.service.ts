import { Prisma } from '@prisma/client';
import prisma from '../../config/db';
import { AuthUser } from '../../middleware/auth.middleware';
import { auditService } from '../audit/audit.service';

export class IssuesService {
  async getAllIssues(reqUser: AuthUser, requestedUserId?: string) {
    let where: Prisma.IssueReportWhereInput = {};

    if (reqUser.role === 'TENANT') {
      where = { userId: reqUser.id };
    } else if (reqUser.role === 'LANDLORD') {
      where = {
        AND: [
          {
            OR: [
              { landlordId: reqUser.id },
              { room: { landlordId: reqUser.id } },
            ],
          },
          ...(requestedUserId ? [{ userId: requestedUserId }] : []),
        ],
      };
    } else if (requestedUserId) {
      where = { userId: requestedUserId };
    }

    return prisma.issueReport.findMany({
      where,
      include: {
        room: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createIssue(
    data: { title: string; description: string; userId?: string; roomId: string; imageUrl?: string },
    reqUser: AuthUser
  ) {
    const room = await prisma.room.findUnique({ where: { id: data.roomId } });
    if (!room) throw new Error('Không tìm thấy phòng.');

    const targetUserId = reqUser.role === 'TENANT' ? reqUser.id : data.userId || reqUser.id;
    const landlordId = room.landlordId;

    const issue = await prisma.issueReport.create({
      data: {
        title: data.title,
        description: data.description,
        userId: targetUserId,
        roomId: data.roomId,
        landlordId,
        imageUrl: data.imageUrl || null,
        isResolved: false,
      },
      include: {
        room: true,
      },
    });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId,
      action: 'CREATE_ISSUE',
      entityType: 'IssueReport',
      entityId: issue.id,
      description: `${reqUser.fullName} báo sự cố Phòng ${room.roomNumber}: "${issue.title}"`,
    });

    return issue;
  }

  async resolveIssue(id: string, reqUser: AuthUser) {
    const existing = await prisma.issueReport.findUnique({
      where: { id },
      include: { room: true },
    });
    if (!existing) throw new Error('Không tìm thấy báo cáo sự cố.');
    if (
      reqUser.role === 'LANDLORD' &&
      existing.landlordId !== reqUser.id &&
      existing.room.landlordId !== reqUser.id
    ) {
      throw new Error('FORBIDDEN');
    }

    const updated = await prisma.issueReport.update({
      where: { id },
      data: { isResolved: true },
    });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: existing.landlordId ?? existing.room.landlordId,
      action: 'RESOLVE_ISSUE',
      entityType: 'IssueReport',
      entityId: updated.id,
      description: `${reqUser.fullName} đã đánh dấu hoàn thành sự cố Phòng ${existing.room.roomNumber}: "${existing.title}"`,
    });

    return updated;
  }

  async deleteIssue(id: string, reqUser: AuthUser) {
    const existing = await prisma.issueReport.findUnique({
      where: { id },
      include: { room: true },
    });
    if (!existing) throw new Error('Không tìm thấy báo cáo sự cố.');
    if (
      reqUser.role === 'LANDLORD' &&
      existing.landlordId !== reqUser.id &&
      existing.room.landlordId !== reqUser.id
    ) {
      throw new Error('FORBIDDEN');
    }

    const deleted = await prisma.issueReport.delete({ where: { id } });

    await auditService.log({
      actorId: reqUser.id,
      actorName: reqUser.fullName,
      actorRole: reqUser.role,
      landlordId: existing.landlordId ?? existing.room.landlordId,
      action: 'DELETE_ISSUE',
      entityType: 'IssueReport',
      entityId: id,
      description: `${reqUser.fullName} đã xóa báo cáo sự cố "${existing.title}"`,
    });

    return deleted;
  }
}
