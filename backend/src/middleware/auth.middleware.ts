import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import permissionService from '../services/permission.service';
import { PermissionName } from '../types/permissions';

/**
 * Authentication Middleware
 * Protects routes by validating JWT access tokens
 */

// Extend Express Request to include user data
export interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    familyId: number;
    role: string;
    permissions?: PermissionName[];
  };
}

/**
 * Middleware to authenticate requests using JWT
 * Expects Authorization header: "Bearer <token>"
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = authService.verifyToken(token);

    // Load user permissions
    const permissions = await permissionService.getUserPermissions(payload.userId);

    // Attach user info to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      familyId: payload.familyId,
      role: payload.role,
      permissions,
    };

    next();
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Invalid token',
    });
  }
};

/**
 * Middleware to check if user is an admin
 * Must be used after authenticate middleware
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required',
    });
    return;
  }

  next();
};

/**
 * Middleware to check if user belongs to a specific family
 * Must be used after authenticate middleware
 */
export const requireFamilyAccess = (familyIdParam: string = 'familyId') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const requestedFamilyId = parseInt(req.params[familyIdParam] || req.body.family_id);

    // Admins can access any family, members can only access their own
    if (req.user.role !== 'admin' && req.user.familyId !== requestedFamilyId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this family',
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated vs anonymous users
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.verifyToken(token);
      const permissions = await permissionService.getUserPermissions(payload.userId);
      req.user = {
        userId: payload.userId,
        email: payload.email,
        familyId: payload.familyId,
        role: payload.role,
        permissions,
      };
    }
  } catch (error) {
    // Silently fail for optional auth
  }
  next();
};

/**
 * Middleware to check if user has a specific permission
 * Must be used after authenticate middleware
 */
export const requirePermission = (...permissions: PermissionName[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!req.user.permissions) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Permissions not loaded',
      });
      return;
    }

    // Check if user has at least one of the required permissions
    const hasPermission = permissions.some(p => req.user!.permissions!.includes(p));

    if (!hasPermission) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        required: permissions,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if user has ALL of the specified permissions
 * Must be used after authenticate middleware
 */
export const requireAllPermissions = (...permissions: PermissionName[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    if (!req.user.permissions) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Permissions not loaded',
      });
      return;
    }

    // Check if user has all required permissions
    const hasAllPermissions = permissions.every(p => req.user!.permissions!.includes(p));

    if (!hasAllPermissions) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        required: permissions,
      });
      return;
    }

    next();
  };
};
