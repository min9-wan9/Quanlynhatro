import { Request, Response } from 'express';
import { ContractsService } from './contracts.service';

const contractsService = new ContractsService();

export class ContractsController {
  async create(req: Request, res: Response) {
    try {
      const contract = await contractsService.createContract(req.body);
      res.status(201).json(contract);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const contracts = await contractsService.getAllContracts();
      res.json(contracts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async signContract(req: Request, res: Response) {
    try {
      const contractId = req.params.id as string;
      const contract = await contractsService.signContract(contractId);
      res.json(contract);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async requestCheckOut(req: Request, res: Response) {
    try {
      const contractId = req.params.id as string;
      const request = await contractsService.requestCheckOut(contractId, req.body);
      res.status(201).json(request);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async processCheckOut(req: Request, res: Response) {
    try {
      const requestId = req.params.requestId as string;
      const result = await contractsService.processCheckOut(requestId, req.body);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const contractId = req.params.id as string;
      const contract = await contractsService.updateContract(contractId, req.body);
      res.json(contract);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const contractId = req.params.id as string;
      await contractsService.deleteContract(contractId);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
