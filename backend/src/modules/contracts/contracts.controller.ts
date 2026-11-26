import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { ContractsService } from './contracts.service';

const contractsService = new ContractsService();

export class ContractsController {
  async create(req: AuthRequest, res: Response) {
    try {
      const contract = await contractsService.createContract(req.body, req.user!);
      res.status(201).json(contract);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAll(req: AuthRequest, res: Response) {
    try {
      const contracts = await contractsService.getAllContracts(req.user!);
      res.json(contracts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async signContract(req: AuthRequest, res: Response) {
    try {
      const contractId = req.params.id as string;
      const contract = await contractsService.signContract(contractId, req.user!);
      res.json(contract);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền ký hợp đồng này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async requestCheckOut(req: AuthRequest, res: Response) {
    try {
      const contractId = req.params.id as string;
      const request = await contractsService.requestCheckOut(
        contractId,
        req.body,
        req.user!
      );
      res.status(201).json(request);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền gửi yêu cầu trả phòng.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async processCheckOut(req: AuthRequest, res: Response) {
    try {
      const requestId = req.params.requestId as string;
      const result = await contractsService.processCheckOut(
        requestId,
        req.body,
        req.user!
      );
      res.json(result);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền duyệt yêu cầu trả phòng này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const contractId = req.params.id as string;
      const contract = await contractsService.updateContract(
        contractId,
        req.body,
        req.user!
      );
      res.json(contract);
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền sửa hợp đồng này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const contractId = req.params.id as string;
      await contractsService.deleteContract(contractId, req.user!);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'Không có quyền xóa hợp đồng này.' });
      }
      res.status(500).json({ error: error.message });
    }
  }
}
