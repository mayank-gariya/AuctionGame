import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'jsancfn48nHXO1H8nvc340vd';

// Extend Express Request interface to include authenticated user info
export interface AuthenticatedRequest extends Request {
  user?: { userId: string };
}

export const verifyAccessToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access token missing or malformed' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string);
    (req as any).user = payload;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired access token' });
    return;
  }
};