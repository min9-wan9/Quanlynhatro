import prisma from '../../config/db';

export class IssuesService {
  async getAllIssues() {
    return prisma.issueReport.findMany({
      include: {
        room: true,
        user: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getIssuesByUser(userId: string) {
    return prisma.issueReport.findMany({
      where: { userId },
      include: {
        room: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createIssue(data: { title: string; description: string; userId: string; roomId: string; imageUrl?: string }) {
    return prisma.issueReport.create({
      data: {
        title: data.title,
        description: data.description,
        userId: data.userId,
        roomId: data.roomId,
        imageUrl: data.imageUrl || null,
        isResolved: false
      },
      include: {
        room: true
      }
    });
  }

  async resolveIssue(id: string) {
    return prisma.issueReport.update({
      where: { id },
      data: { isResolved: true }
    });
  }

  async deleteIssue(id: string) {
    return prisma.issueReport.delete({
      where: { id }
    });
  }
}
