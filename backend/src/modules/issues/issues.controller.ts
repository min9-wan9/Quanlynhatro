import { Request, Response } from 'express';
import { IssuesService } from './issues.service';

const issuesService = new IssuesService();

export class IssuesController {
  async getAll(req: Request, res: Response) {
    try {
      const { userId } = req.query;
      if (userId) {
        const issues = await issuesService.getIssuesByUser(userId as string);
        res.json(issues);
      } else {
        const issues = await issuesService.getAllIssues();
        res.json(issues);
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const issue = await issuesService.createIssue(req.body);
      res.status(201).json(issue);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async resolve(req: Request, res: Response) {
    try {
      const issue = await issuesService.resolveIssue(req.params.id as string);
      res.json(issue);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async deleteIssue(req: Request, res: Response) {
    try {
      await issuesService.deleteIssue(req.params.id as string);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
