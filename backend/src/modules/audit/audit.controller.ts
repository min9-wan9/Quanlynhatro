import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { auditService } from './audit.service';

export class AuditController {
  async getLogs(req: AuthRequest, res: Response) {
    try {
      const { actorId, landlordId, action, search, fromDate, toDate, page, limit } =
        req.query;

      const result = await auditService.getLogs({
        actorId: typeof actorId === 'string' && actorId ? actorId : undefined,
        landlordId:
          typeof landlordId === 'string' && landlordId ? landlordId : undefined,
        action: typeof action === 'string' && action ? action : undefined,
        search: typeof search === 'string' && search ? search : undefined,
        fromDate: typeof fromDate === 'string' && fromDate ? fromDate : undefined,
        toDate: typeof toDate === 'string' && toDate ? toDate : undefined,
        page: typeof page === 'string' ? Number(page) : undefined,
        limit: typeof limit === 'string' ? Number(limit) : undefined,
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
