import { Router, Response } from 'express';
import db from '../database/knex';
import authService from '../services/auth.service';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/families/:id
 * Get family details
 */
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const familyId = parseInt(req.params.id);
    if (isNaN(familyId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid family ID' });
      return;
    }

    // Users can only access their own family (unless admin)
    if (req.user.role !== 'admin' && req.user.familyId !== familyId) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied to this family' });
      return;
    }

    const family = await db('families').where({ id: familyId }).first();

    if (!family) {
      res.status(404).json({ error: 'Not Found', message: 'Family not found' });
      return;
    }

    // Get member count
    const memberCount = await db('users')
      .where({ family_id: familyId })
      .count('id as count')
      .first();

    res.status(200).json({
      family: {
        ...family,
        memberCount: Number(memberCount?.count || 0),
      },
    });
  } catch (error: any) {
    console.error('Error fetching family:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch family',
    });
  }
});

/**
 * PUT /api/v1/families/:id
 * Update family settings
 */
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const familyId = parseInt(req.params.id);
    if (isNaN(familyId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid family ID' });
      return;
    }

    // Only admins can update family settings
    if (req.user.role !== 'admin' || req.user.familyId !== familyId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only family admins can update family settings',
      });
      return;
    }

    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Validation Error', message: 'Family name is required' });
      return;
    }

    await db('families').where({ id: familyId }).update({
      name,
      updated_at: new Date(),
    });

    const family = await db('families').where({ id: familyId }).first();

    res.status(200).json({
      message: 'Family updated successfully',
      family,
    });
  } catch (error: any) {
    console.error('Error updating family:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: error.message || 'Failed to update family',
    });
  }
});

/**
 * GET /api/v1/families/:id/members
 * List family members
 */
router.get('/:id/members', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const familyId = parseInt(req.params.id);
    if (isNaN(familyId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid family ID' });
      return;
    }

    // Users can only access their own family members (unless admin)
    if (req.user.role !== 'admin' && req.user.familyId !== familyId) {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied to this family' });
      return;
    }

    const members = await db('users')
      .where({ family_id: familyId })
      .select('id', 'email', 'first_name', 'last_name', 'role', 'color', 'created_at')
      .orderBy('created_at', 'asc');

    res.status(200).json({
      members,
      count: members.length,
    });
  } catch (error: any) {
    console.error('Error fetching family members:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch family members',
    });
  }
});

/**
 * POST /api/v1/families/:id/members
 * Add a new member to the family (invite/create user)
 */
router.post('/:id/members', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const familyId = parseInt(req.params.id);
    if (isNaN(familyId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid family ID' });
      return;
    }

    // Only admins can add members
    if (req.user.role !== 'admin' || req.user.familyId !== familyId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only family admins can add members',
      });
      return;
    }

    const { email, password, first_name, last_name, role, color } = req.body;

    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Missing required fields: email, password, first_name, last_name',
      });
      return;
    }

    // Create the new member
    const newUser = await authService.registerUser({
      email,
      password,
      first_name,
      last_name,
      family_id: familyId,
      role: role || 'member',
      color,
    });

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: 'Member added successfully',
      member: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Error adding family member:', error);
    res.status(400).json({
      error: 'Failed to Add Member',
      message: error.message || 'Failed to add family member',
    });
  }
});

/**
 * DELETE /api/v1/families/:id/members/:userId
 * Remove a member from the family
 */
router.delete('/:id/members/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const familyId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    if (isNaN(familyId) || isNaN(userId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid family or user ID' });
      return;
    }

    // Only admins can remove members
    if (req.user.role !== 'admin' || req.user.familyId !== familyId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only family admins can remove members',
      });
      return;
    }

    // Can't remove yourself
    if (userId === req.user.userId) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Cannot remove yourself from the family',
      });
      return;
    }

    // Verify user belongs to the family
    const user = await db('users').where({ id: userId, family_id: familyId }).first();

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found in this family',
      });
      return;
    }

    // Delete the user
    await db('users').where({ id: userId }).delete();

    res.status(200).json({
      message: 'Member removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing family member:', error);
    res.status(500).json({
      error: 'Delete Failed',
      message: error.message || 'Failed to remove family member',
    });
  }
});

/**
 * POST /api/v1/families
 * Create a new family (admin only)
 */
router.post('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Validation Error', message: 'Family name is required' });
      return;
    }

    const [familyId] = await db('families').insert({ name });

    const family = await db('families').where({ id: familyId }).first();

    res.status(201).json({
      message: 'Family created successfully',
      family,
    });
  } catch (error: any) {
    console.error('Error creating family:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to create family',
    });
  }
});

export default router;
