import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../database/knex';
import authService from '../services/auth.service';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/users/:id
 * Get user details by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid user ID' });
      return;
    }

    const user = await authService.getUserById(userId);

    if (!user) {
      res.status(404).json({ error: 'Not Found', message: 'User not found' });
      return;
    }

    // Users can only view users in their own family (unless admin)
    if (req.user.role !== 'admin' && user.family_id !== req.user.familyId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this user',
      });
      return;
    }

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user;

    res.status(200).json({ user: userWithoutPassword });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch user',
    });
  }
});

/**
 * PUT /api/v1/users/:id
 * Update user details (admin only, or self with limited fields)
 */
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid user ID' });
      return;
    }

    const targetUser = await authService.getUserById(userId);

    if (!targetUser) {
      res.status(404).json({ error: 'Not Found', message: 'User not found' });
      return;
    }

    // Check permissions
    const isSelf = userId === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    const isSameFamily = targetUser.family_id === req.user.familyId;

    if (!isSelf && !isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own profile or be an admin',
      });
      return;
    }

    if (isAdmin && !isSameFamily && !isSelf) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Admins can only update users in their own family',
      });
      return;
    }

    const updates = req.body;

    // Users can only update certain fields on themselves
    if (isSelf && !isAdmin) {
      // Remove sensitive fields
      delete updates.role;
      delete updates.family_id;
      delete updates.password_hash;
    }

    // Admins can update more fields but not password_hash directly
    if (isAdmin) {
      delete updates.password_hash;
      delete updates.family_id; // Don't allow moving users between families
    }

    const updatedUser = await authService.updateUser(userId, updates);

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = updatedUser;

    res.status(200).json({
      message: 'User updated successfully',
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: error.message || 'Failed to update user',
    });
  }
});

/**
 * DELETE /api/v1/users/:id
 * Delete a user (admin only)
 */
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid user ID' });
      return;
    }

    // Can't delete yourself
    if (userId === req.user.userId) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Cannot delete your own account',
      });
      return;
    }

    const targetUser = await authService.getUserById(userId);

    if (!targetUser) {
      res.status(404).json({ error: 'Not Found', message: 'User not found' });
      return;
    }

    // Admins can only delete users in their own family
    if (targetUser.family_id !== req.user.familyId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete users in your own family',
      });
      return;
    }

    await db('users').where({ id: userId }).delete();

    res.status(200).json({
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: 'Delete Failed',
      message: error.message || 'Failed to delete user',
    });
  }
});

/**
 * GET /api/v1/users
 * List users in the authenticated user's family
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const users = await db('users')
      .where({ family_id: req.user.familyId })
      .select(
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'color',
        'status',
        'invitation_sent_at',
        'invitation_accepted_at',
        'invited_by',
        'created_at',
        'updated_at'
      )
      .orderBy('created_at', 'asc');

    res.status(200).json({
      users,
      count: users.length,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch users',
    });
  }
});

/**
 * POST /api/v1/users
 * Create a new user directly with password (admin only)
 * No invitation flow - user can log in immediately
 */
router.post('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { email, firstName, lastName, password, role = 'member' } = req.body;

    // Validate input
    if (!email || !firstName || !lastName || !password) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Email, first name, last name, and password are required'
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 8 characters long',
      });
      return;
    }

    if (!/[A-Z]/.test(password)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Password must contain at least one uppercase letter',
      });
      return;
    }

    if (!/[a-z]/.test(password)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Password must contain at least one lowercase letter',
      });
      return;
    }

    if (!/[0-9]/.test(password)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Password must contain at least one number',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await db('users')
      .where({ email: email.toLowerCase() })
      .first();

    if (existingUser) {
      res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists'
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create active user
    const [userId] = await db('users').insert({
      family_id: req.user.familyId,
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      password_hash: passwordHash,
      role: role === 'admin' ? 'admin' : 'member',
      status: 'active',
      color: null,
    });

    const user = await db('users')
      .where({ id: userId })
      .select(
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'status',
        'created_at'
      )
      .first();

    res.status(201).json({
      message: 'User created successfully',
      user,
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to create user',
    });
  }
});

/**
 * POST /api/v1/users/invite
 * Invite a new user to the family (admin only)
 */
router.post('/invite', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { email, firstName, lastName, role = 'member' } = req.body;

    // Validate input
    if (!email || !firstName || !lastName) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Email, first name, and last name are required'
      });
      return;
    }

    // Check if user already exists
    const existingUser = await db('users')
      .where({ email: email.toLowerCase() })
      .first();

    if (existingUser) {
      res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists'
      });
      return;
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');

    // Generate a placeholder password hash for invited users
    // This will be replaced when they accept the invitation
    // Using a random hash that cannot be guessed or used for login
    const placeholderPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    // Create invited user
    const [userId] = await db('users').insert({
      family_id: req.user.familyId,
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      role: role === 'admin' ? 'admin' : 'member',
      status: 'invited',
      invitation_token: invitationToken,
      invitation_sent_at: new Date(),
      invited_by: req.user.userId,
      password_hash: placeholderPasswordHash, // Placeholder until invitation is accepted
      color: null,
    });

    const user = await db('users')
      .where({ id: userId })
      .select(
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'status',
        'invitation_sent_at'
      )
      .first();

    // TODO: Send invitation email with token
    // For now, return the invitation link in the response (for dev/testing only)
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation?token=${invitationToken}`;

    res.status(201).json({
      message: 'User invited successfully',
      user,
      invitationLink, // Remove this in production - send via email only
    });
  } catch (error: any) {
    console.error('Invite user error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to invite user',
    });
  }
});

/**
 * POST /api/v1/users/accept-invitation
 * Accept an invitation and set password (no auth required)
 */
router.post('/accept-invitation', async (req, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Token and password are required'
      });
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 8 characters long',
      });
      return;
    }

    // Find user by invitation token
    const user = await db('users')
      .where({ invitation_token: token, status: 'invited' })
      .first();

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Invalid or expired invitation token'
      });
      return;
    }

    // Check if invitation is not too old (7 days)
    const invitationAge = Date.now() - new Date(user.invitation_sent_at).getTime();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (invitationAge > maxAge) {
      res.status(410).json({
        error: 'Gone',
        message: 'Invitation has expired'
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user
    await db('users')
      .where({ id: user.id })
      .update({
        password_hash: passwordHash,
        status: 'active',
        invitation_accepted_at: new Date(),
        invitation_token: null,
        updated_at: new Date(),
      });

    res.status(200).json({
      message: 'Invitation accepted successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
    });
  } catch (error: any) {
    console.error('Accept invitation error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to accept invitation',
    });
  }
});

/**
 * PUT /api/v1/users/:id/role
 * Update user role (admin only)
 */
router.put('/:id/role', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid user ID' });
      return;
    }

    if (!role || !['admin', 'member'].includes(role)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Role must be either "admin" or "member"',
      });
      return;
    }

    // Can't change your own role
    if (userId === req.user.userId) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Cannot change your own role',
      });
      return;
    }

    const targetUser = await authService.getUserById(userId);

    if (!targetUser) {
      res.status(404).json({ error: 'Not Found', message: 'User not found' });
      return;
    }

    // Can only change roles for users in the same family
    if (targetUser.family_id !== req.user.familyId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only change roles for users in your own family',
      });
      return;
    }

    await db('users').where({ id: userId }).update({
      role,
      updated_at: new Date(),
    });

    const updatedUser = await authService.getUserById(userId);
    const { password_hash, ...userWithoutPassword } = updatedUser!;

    res.status(200).json({
      message: 'User role updated successfully',
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: error.message || 'Failed to update user role',
    });
  }
});

export default router;
