import { Router } from 'express';
import { IssuesController } from './issues.controller';

const router = Router();
const issuesController = new IssuesController();

router.get('/', issuesController.getAll);
router.post('/', issuesController.create);
router.put('/:id/resolve', issuesController.resolve);
router.delete('/:id', issuesController.deleteIssue);

export default router;
