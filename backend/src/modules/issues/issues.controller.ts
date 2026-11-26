import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { IssuesService } from './issues.service';

const issuesService = new IssuesService();

export class IssuesController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.query;
      const issues = await issuesService.getAllIssues(
        req.user!,
        typeof userId === 'string' ? userId : undefined
      );
      res.json(issues);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const issue = await issuesService.createIssue(req.body, req.user!);
      res.status(201).json(issue);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async resolve(req: AuthRequest, res: Response) {
    try {
      const issue = await issuesService.resolveIssue(
        req.params.id as string,
        req.user!
      );
      res.json(issue);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền xử lý sự cố này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async deleteIssue(req: AuthRequest, res: Response) {
    try {
      await issuesService.deleteIssue(req.params.id as string, req.user!);
      res.json({ success: true });
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền xóa sự cố này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }
}
