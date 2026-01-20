import { Router, Request, Response } from 'express';
import authService from '../services/auth.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, first_name, last_name, family_id, role, color } = req.body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name || !family_id) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Missing required fields: email, password, first_name, last_name, family_id',
      });
      return;
    }

    // Register user
    const user = await authService.registerUser({
      email,
      password,
      first_name,
      last_name,
      family_id: parseInt(family_id),
      role: role || 'member',
      color: color || null,
    });

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user;

    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      error: 'Registration Failed',
      message: error instanceof Error ? error.message : 'Failed to register user',
    });
  }
});

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT tokens
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required',
      });
      return;
    }

    // Authenticate user
    const { user, tokens } = await authService.loginUser(email, password);

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user;

    res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword,
      tokens,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      error: 'Authentication Failed',
      message: error instanceof Error ? error.message : 'Invalid credentials',
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Refresh token is required',
      });
      return;
    }

    // Refresh tokens
    const tokens = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      message: 'Token refreshed successfully',
      tokens,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: 'Token Refresh Failed',
      message: error instanceof Error ? error.message : 'Invalid refresh token',
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Revoke refresh token (logout user)
 */
router.post('/logout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authService.revokeRefreshToken(refreshToken);
    }

    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout Failed',
      message: error instanceof Error ? error.message : 'Failed to logout',
    });
  }
});

/**
 * POST /api/v1/auth/logout-all
 * Revoke all refresh tokens for the authenticated user
 */
router.post('/logout-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    await authService.revokeAllUserTokens(req.user.userId);

    res.status(200).json({
      message: 'All sessions terminated successfully',
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Logout Failed',
      message: error instanceof Error ? error.message : 'Failed to terminate sessions',
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current authenticated user's profile
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const user = await authService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user;

    res.status(200).json({
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error instanceof Error ? error.message : 'Failed to get user',
    });
  }
});

/**
 * PUT /api/v1/auth/me
 * Update current authenticated user's profile
 */
router.put('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const updates = req.body;

    // Don't allow updating sensitive fields via this endpoint
    delete updates.password_hash;
    delete updates.id;
    delete updates.family_id;

    const user = await authService.updateUser(req.user.userId, updates);

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user;

    res.status(200).json({
      message: 'Profile updated successfully',
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: error instanceof Error ? error.message : 'Failed to update profile',
    });
  }
});

/**
 * PUT /api/v1/auth/change-password
 * Change user's password
 */
router.put('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Current password and new password are required',
      });
      return;
    }

    await authService.changePassword(req.user.userId, currentPassword, newPassword);

    res.status(200).json({
      message: 'Password changed successfully. All sessions have been terminated.',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({
      error: 'Password Change Failed',
      message: error instanceof Error ? error.message : 'Failed to change password',
    });
  }
});

export default router;
