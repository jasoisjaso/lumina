import express, { Request, Response } from 'express';
import { googleCalendarService } from '../services/google-calendar.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * Calendar Sync Routes
 * Handles Google Calendar OAuth and sync operations
 */

/**
 * GET /api/v1/calendar-sync/google/auth-url
 * Get Google Calendar OAuth authorization URL
 */
router.get('/google/auth-url', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const authUrl = googleCalendarService.getAuthorizationUrl(userId);

    res.json({
      authUrl,
      message: 'Navigate to this URL to authorize Google Calendar access',
    });
  } catch (error: any) {
    console.error('Get auth URL error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to generate authorization URL',
    });
  }
});

/**
 * POST /api/v1/calendar-sync/google/callback
 * Handle OAuth callback - exchange code for tokens
 */
router.post('/google/callback', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user!.userId;
    const familyId = req.user!.familyId;

    if (!code) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Authorization code is required',
      });
      return;
    }

    // Exchange code for tokens
    const tokens = await googleCalendarService.exchangeCodeForTokens(code);

    // Store tokens
    await googleCalendarService.storeUserTokens(userId, familyId, tokens);

    // Perform initial sync
    const syncResult = await googleCalendarService.syncEventsForUser(userId, familyId);

    res.json({
      message: 'Google Calendar connected successfully',
      syncResult,
    });
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to complete OAuth flow',
    });
  }
});

/**
 * POST /api/v1/calendar-sync/google/sync
 * Manually trigger Google Calendar sync
 */
router.post('/google/sync', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const familyId = req.user!.familyId;

    const isConnected = await googleCalendarService.isConnected(userId);
    if (!isConnected) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Google Calendar not connected. Please authorize first.',
      });
      return;
    }

    const syncResult = await googleCalendarService.syncEventsForUser(userId, familyId);

    res.json({
      message: 'Google Calendar sync completed',
      result: syncResult,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to sync calendar',
    });
  }
});

/**
 * GET /api/v1/calendar-sync/google/status
 * Get Google Calendar sync status
 */
router.get('/google/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const status = await googleCalendarService.getSyncStatus(userId);

    res.json({
      status,
    });
  } catch (error: any) {
    console.error('Get status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to get sync status',
    });
  }
});

/**
 * DELETE /api/v1/calendar-sync/google/disconnect
 * Disconnect Google Calendar
 */
router.delete('/google/disconnect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    await googleCalendarService.disconnectCalendar(userId);

    res.json({
      message: 'Google Calendar disconnected successfully',
    });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to disconnect calendar',
    });
  }
});

/**
 * GET /api/v1/calendar-sync/status
 * Get overall sync status for all providers
 */
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const googleStatus = await googleCalendarService.getSyncStatus(userId);

    res.json({
      providers: {
        google: googleStatus,
      },
    });
  } catch (error: any) {
    console.error('Get overall status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to get sync status',
    });
  }
});

export default router;
