import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { UsersService } from './users.service';

const usersService = new UsersService();

export class UsersController {
  async getAllTenants(req: AuthRequest, res: Response) {
    try {
      const tenants = await usersService.getAllTenants(req.user!);
      res.json(tenants);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAllLandlords(_req: AuthRequest, res: Response) {
    try {
      const landlords = await usersService.getAllLandlords();
      res.json(landlords);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createLandlord(req: AuthRequest, res: Response) {
    try {
      const landlord = await usersService.createLandlord(req.body, req.user!);
      res.status(201).json(landlord);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async toggleLandlordStatus(req: AuthRequest, res: Response) {
    try {
      const { isActive } = req.body;
      const updated = await usersService.toggleLandlordStatus(
        req.params.id as string,
        Boolean(isActive),
        req.user!
      );
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getUserById(req: AuthRequest, res: Response) {
    try {
      const user = await usersService.getUserById(req.params.id as string, req.user!);
      if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
      res.json(user);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền truy cập người dùng này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async createTenant(req: AuthRequest, res: Response) {
    try {
      const tenant = await usersService.createTenant(req.body, req.user!);
      if (req.body.roomId) {
        await usersService.assignRoom(tenant.id, req.body.roomId, req.user!);
      }
      res.status(201).json(tenant);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền gán phòng này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async updateTenant(req: AuthRequest, res: Response) {
    try {
      const updated = await usersService.updateTenant(
        req.params.id as string,
        req.body,
        req.user!
      );
      res.json(updated);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền sửa tài khoản này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { identifier, password, role } = req.body;
      const ipAddress =
        (typeof req.headers['x-forwarded-for'] === 'string'
          ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
          : undefined) || req.ip;
      const result = await usersService.login(identifier, password, role, ipAddress);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async changePassword(req: AuthRequest, res: Response) {
    try {
      const { oldPassword, newPassword } = req.body;
      await usersService.changePassword(
        req.params.id as string,
        oldPassword,
        newPassword,
        req.user!
      );
      res.json({ message: 'Đổi mật khẩu thành công' });
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền đổi mật khẩu tài khoản này.' });
      }
      res.status(400).json({ error: error.message });
    }
  }
}
