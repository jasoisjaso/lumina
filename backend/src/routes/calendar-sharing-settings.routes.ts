import { Router, Response } from 'express';
import calendarSharingService from '../services/calendar-sharing.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import db from '../database/knex';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/calendar-sharing/my-settings
 * Get current user's calendar sharing settings
 */
router.get('/my-settings', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const settings = await calendarSharingService.getUserSharingSettings(req.user.userId);

    res.status(200).json({ settings });
  } catch (error: any) {
    console.error('Get sharing settings error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to retrieve sharing settings',
    });
  }
});

/**
 * GET /api/v1/calendar-sharing/family-members
 * Get list of family members (for sharing UI)
 */
router.get('/family-members', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    // Get all family members except current user
    const members = await db('users')
      .where('family_id', req.user.familyId)
      .where('id', '!=', req.user.userId)
      .where('status', 'active')
      .select('id', 'first_name', 'last_name', 'email', 'color')
      .orderBy('first_name', 'asc');

    res.status(200).json({
      members: members.map((m: any) => ({
        id: m.id,
        name: `${m.first_name} ${m.last_name}`,
        email: m.email,
        color: m.color,
      })),
    });
  } catch (error: any) {
    console.error('Get family members error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to retrieve family members',
    });
  }
});

/**
 * POST /api/v1/calendar-sharing/share
 * Share calendar with a specific user
 */
router.post('/share', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { userId, canView = true, canEdit = false } = req.body;

    if (!userId) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'userId is required',
      });
      return;
    }

    await calendarSharingService.shareCalendar(req.user.userId, userId, canView, canEdit);

    res.status(200).json({
      message: 'Calendar shared successfully',
    });
  } catch (error: any) {
    console.error('Share calendar error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to share calendar',
    });
  }
});

/**
 * DELETE /api/v1/calendar-sharing/unshare/:userId
 * Unshare calendar with a specific user
 */
router.delete('/unshare/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid userId',
      });
      return;
    }

    await calendarSharingService.unshareCalendar(req.user.userId, userId);

    res.status(200).json({
      message: 'Calendar unshared successfully',
    });
  } catch (error: any) {
    console.error('Unshare calendar error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to unshare calendar',
    });
  }
});

/**
 * PUT /api/v1/calendar-sharing/settings
 * Batch update all sharing settings
 */
router.put('/settings', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { sharingSettings } = req.body;

    if (!Array.isArray(sharingSettings)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'sharingSettings must be an array',
      });
      return;
    }

    await calendarSharingService.updateAllSharingSettings(req.user.userId, sharingSettings);

    res.status(200).json({
      message: 'Sharing settings updated successfully',
    });
  } catch (error: any) {
    console.error('Update sharing settings error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update sharing settings',
    });
  }
});

/**
 * GET /api/v1/calendar-sharing/shared-with-me
 * Get calendars shared with current user
 */
router.get('/shared-with-me', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const calendars = await calendarSharingService.getCalendarsSharedWithUser(req.user.userId);

    res.status(200).json({
      calendars: calendars.map(c => ({
        ownerId: c.ownerId,
        ownerName: `${c.first_name} ${c.last_name}`,
        color: c.color,
        canEdit: c.canEdit,
      })),
    });
  } catch (error: any) {
    console.error('Get shared calendars error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to retrieve shared calendars',
    });
  }
});

export default router;
