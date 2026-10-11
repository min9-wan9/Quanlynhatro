import { Request, Response } from 'express';
import { UsersService } from './users.service';

const usersService = new UsersService();

export class UsersController {
  async getAllTenants(req: Request, res: Response) {
    try {
      const tenants = await usersService.getAllTenants();
      res.json(tenants);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getUserById(req: Request, res: Response) {
    try {
      const user = await usersService.getUserById(req.params.id as string);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createTenant(req: Request, res: Response) {
    try {
      const tenant = await usersService.createTenant(req.body);
      if (req.body.roomId) {
        await usersService.assignRoom(tenant.id, req.body.roomId);
      }
      res.status(201).json(tenant);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateTenant(req: Request, res: Response) {
    try {
      const updated = await usersService.updateTenant(req.params.id as string, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { identifier, password, role } = req.body;
      const user = await usersService.login(identifier, password, role);
      res.json({ user, token: 'mock-jwt-token-from-backend' });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body;
      const user = await usersService.changePassword(req.params.id as string, oldPassword, newPassword);
      res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
