import { Request, Response } from 'express';
import { RoomsService } from './rooms.service';

const roomsService = new RoomsService();

export class RoomsController {
  async getAll(req: Request, res: Response) {
    try {
      const rooms = await roomsService.getAllRooms();
      res.json(rooms);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const room = await roomsService.getRoomById(req.params.id as string);
      if (!room) return res.status(404).json({ message: 'Room not found' });
      res.json(room);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const newRoom = await roomsService.createRoom(req.body);
      res.status(201).json(newRoom);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const updatedRoom = await roomsService.updateRoom(req.params.id as string, req.body);
      res.json(updatedRoom);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      await roomsService.deleteRoom(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async saveUtility(req: Request, res: Response) {
    try {
      const { month, year, waterNumber, powerNumber } = req.body;
      const reading = await roomsService.saveUtilityReading(req.params.id as string, {
        month: Number(month),
        year: Number(year),
        waterNumber: Number(waterNumber),
        powerNumber: Number(powerNumber)
      });
      res.json(reading);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
