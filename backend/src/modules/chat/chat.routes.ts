import { Router } from 'express';
import { ChatController } from './chat.controller';

const router = Router();
const controller = new ChatController();

router.post('/', controller.handleChat);

export default router;
