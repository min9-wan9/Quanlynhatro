import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { RoomsService } from './rooms.service';

const roomsService = new RoomsService();

export class RoomsController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const rooms = await roomsService.getAllRooms(req.user!);
      res.json(rooms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const room = await roomsService.getRoomById(req.params.id as string, req.user!);
      if (!room) return res.status(404).json({ message: 'Room not found' });
      res.json(room);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền truy cập phòng này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const newRoom = await roomsService.createRoom(req.body, req.user!);
      res.status(201).json(newRoom);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const updatedRoom = await roomsService.updateRoom(
        req.params.id as string,
        req.body,
        req.user!
      );
      res.json(updatedRoom);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền sửa phòng này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      await roomsService.deleteRoom(req.params.id as string, req.user!);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền xóa phòng này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async saveUtility(req: AuthRequest, res: Response) {
    try {
      const { month, year, waterNumber, powerNumber } = req.body;
      const reading = await roomsService.saveUtilityReading(
        req.params.id as string,
        {
          month: Number(month),
          year: Number(year),
          waterNumber: Number(waterNumber),
          powerNumber: Number(powerNumber),
        },
        req.user!
      );
      res.json(reading);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền cập nhật điện nước phòng này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }
}
