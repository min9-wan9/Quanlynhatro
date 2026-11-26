import { NextFunction, Request, Response } from 'express';
import prisma from '../config/db';
import { JwtRole, verifyJwt } from '../utils/jwt';

export interface AuthUser {
  id: string;
  role: JwtRole;
  fullName: string;
  email: string;
  phone: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser | undefined;
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
    }

    const decoded = verifyJwt(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        fullName: true,
        email: true,
        phone: true,
        isActive: true,
      },
    });

    if (!dbUser) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại.' });
    }

    if (!dbUser.isActive) {
      return res.status(403).json({ error: 'Tài khoản đã bị khóa. Vui lòng liên hệ Admin.' });
    }

    req.user = {
      id: dbUser.id,
      role: dbUser.role as JwtRole,
      fullName: dbUser.fullName,
      email: dbUser.email,
      phone: dbUser.phone,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Lỗi xác thực hệ thống.' });
  }
}

export async function optionalAuthenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) return next();

    const decoded = verifyJwt(token);
    if (!decoded) return next();

    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        fullName: true,
        email: true,
        phone: true,
        isActive: true,
      },
    });

    if (dbUser && dbUser.isActive) {
      req.user = {
        id: dbUser.id,
        role: dbUser.role as JwtRole,
        fullName: dbUser.fullName,
        email: dbUser.email,
        phone: dbUser.phone,
      };
    }
  } catch {
    // Ignore optional auth failure
  }
  next();
}

export function authorize(...roles: JwtRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này.' });
    }
    next();
  };
}
