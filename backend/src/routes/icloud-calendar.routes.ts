import { Router, Response } from 'express';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import { icloudCalendarService } from '../services/icloud-calendar.service';

const router = Router();

/**
 * iCloud Calendar Routes
 * CalDAV integration for syncing iCloud calendar events
 */

/**
 * POST /api/v1/icloud-calendar/test
 * Test iCloud CalDAV connection with credentials
 * Admin only
 */
router.post('/test', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { appleId, appPassword } = req.body;

    if (!appleId || !appPassword) {
      return res.status(400).json({
        success: false,
        message: 'Apple ID and App-Specific Password are required',
      });
    }

    const result = await icloudCalendarService.testConnection(appleId, appPassword);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('iCloud test connection error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test iCloud connection',
    });
  }
});

/**
 * POST /api/v1/icloud-calendar/discover
 * Discover available calendars for the user
 * Admin only
 */
router.post('/discover', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { appleId, appPassword } = req.body;

    if (!appleId || !appPassword) {
      return res.status(400).json({
        error: 'Missing Credentials',
        message: 'Apple ID and App-Specific Password are required',
      });
    }

    const calendars = await icloudCalendarService.discoverCalendars(appleId, appPassword);

    res.json({
      calendars,
      message: `Found ${calendars.length} calendar(s)`,
    });
  } catch (error: any) {
    console.error('iCloud discover calendars error:', error);
    res.status(500).json({
      error: 'Discovery Failed',
      message: error.message || 'Failed to discover calendars',
    });
  }
});

/**
 * POST /api/v1/icloud-calendar/sync
 * Manually trigger iCloud calendar sync
 * Requires authentication
 */
router.post('/sync', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;

    // Check if iCloud is enabled
    const isEnabled = await icloudCalendarService.isEnabledForFamily(familyId);
    if (!isEnabled) {
      return res.status(400).json({
        error: 'Feature Disabled',
        message: 'iCloud Calendar integration is not enabled for your family',
      });
    }

    // Trigger sync
    const result = await icloudCalendarService.syncCalendar(familyId);

    res.json({
      message: 'iCloud calendar sync completed',
      synced: result.synced,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('iCloud sync error:', error);
    res.status(500).json({
      error: 'Sync Failed',
      message: error.message || 'Failed to sync iCloud calendar',
    });
  }
});

/**
 * GET /api/v1/icloud-calendar/status
 * Get iCloud calendar integration status
 */
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;

    const isEnabled = await icloudCalendarService.isEnabledForFamily(familyId);
    const config = await icloudCalendarService.getICloudConfig(familyId);

    res.json({
      enabled: isEnabled,
      configured: config !== null,
      appleId: config?.appleId || null,
      calendarUrl: config?.calendarUrl || null,
    });
  } catch (error: any) {
    console.error('iCloud status error:', error);
    res.status(500).json({
      error: 'Status Check Failed',
      message: error.message || 'Failed to get iCloud calendar status',
    });
  }
});

/**
 * DELETE /api/v1/icloud-calendar/disconnect
 * Disconnect iCloud calendar and delete all synced events
 * Admin only
 */
router.delete('/disconnect', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;

    // Delete all iCloud events
    await icloudCalendarService.deleteAllEvents(familyId);

    res.json({
      message: 'iCloud calendar disconnected and all events deleted',
    });
  } catch (error: any) {
    console.error('iCloud disconnect error:', error);
    res.status(500).json({
      error: 'Disconnect Failed',
      message: error.message || 'Failed to disconnect iCloud calendar',
    });
  }
});

export default router;
