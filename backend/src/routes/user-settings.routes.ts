import { Router, Response } from 'express';
import userSettingsService from '../services/user-settings.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/user-settings
 * Get all user settings (integrations + preferences)
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const settings = await userSettingsService.getAllSettings(req.user.userId);

    res.status(200).json({ settings });
  } catch (error: any) {
    console.error('Get user settings error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to retrieve user settings',
    });
  }
});

/**
 * GET /api/v1/user-settings/:type
 * Get specific settings type (integrations or preferences)
 */
router.get('/:type', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { type } = req.params;

    if (type !== 'integrations' && type !== 'preferences') {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid settings type. Must be "integrations" or "preferences"',
      });
      return;
    }

    const settings = await userSettingsService.getSettings(req.user.userId, type);

    res.status(200).json({ settings });
  } catch (error: any) {
    console.error('Get user settings by type error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to retrieve user settings',
    });
  }
});

/**
 * PUT /api/v1/user-settings/:type
 * Update specific settings type
 */
router.put('/:type', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { type } = req.params;
    const { settings } = req.body;

    if (type !== 'integrations' && type !== 'preferences') {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid settings type. Must be "integrations" or "preferences"',
      });
      return;
    }

    if (!settings) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Settings data is required',
      });
      return;
    }

    await userSettingsService.updateSettings(req.user.userId, type, settings);

    res.status(200).json({
      message: 'User settings updated successfully',
    });
  } catch (error: any) {
    console.error('Update user settings error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update user settings',
    });
  }
});

/**
 * PUT /api/v1/user-settings/integrations/:integration
 * Update specific integration settings
 */
router.put('/integrations/:integration', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { integration } = req.params;
    const integrationData = req.body;

    const validIntegrations = ['googleCalendar', 'icloudCalendar', 'googlePhotos', 'icloudPhotos'];
    if (!validIntegrations.includes(integration)) {
      res.status(400).json({
        error: 'Validation Error',
        message: `Invalid integration. Must be one of: ${validIntegrations.join(', ')}`,
      });
      return;
    }

    await userSettingsService.updateIntegration(req.user.userId, integration as any, integrationData);

    res.status(200).json({
      message: 'Integration settings updated successfully',
    });
  } catch (error: any) {
    console.error('Update integration error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update integration settings',
    });
  }
});

/**
 * POST /api/v1/user-settings/reset/:type
 * Reset settings to defaults
 */
router.post('/reset/:type', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { type } = req.params;

    if (type !== 'integrations' && type !== 'preferences') {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid settings type. Must be "integrations" or "preferences"',
      });
      return;
    }

    await userSettingsService.resetSettings(req.user.userId, type);

    res.status(200).json({
      message: 'User settings reset to defaults successfully',
    });
  } catch (error: any) {
    console.error('Reset user settings error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to reset user settings',
    });
  }
});

export default router;
