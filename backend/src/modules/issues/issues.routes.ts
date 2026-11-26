import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { IssuesController } from './issues.controller';

const router = Router();
const issuesController = new IssuesController();

router.get('/', authenticate, issuesController.getAll);
router.post('/', authenticate, issuesController.create);
router.put('/:id/resolve', authenticate, authorize('LANDLORD', 'ADMIN'), issuesController.resolve);
router.delete('/:id', authenticate, authorize('LANDLORD', 'ADMIN'), issuesController.deleteIssue);

export default router;
