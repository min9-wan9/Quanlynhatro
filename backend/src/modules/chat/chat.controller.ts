import { Request, Response } from 'express';
import { ChatService } from './chat.service';

const chatService = new ChatService();

export class ChatController {
  async handleChat(req: Request, res: Response) {
    try {
      const { message, history } = req.body;
      
      if (!message) {
        return res.status(400).json({ success: false, message: 'Message is required' });
      }

      const reply = await chatService.processChat(message, history || []);
      
      res.json({ success: true, data: reply, reply: reply.text });
    } catch (error: any) {
      console.error('Chat error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
