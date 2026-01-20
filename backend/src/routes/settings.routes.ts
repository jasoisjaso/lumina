import express, { Request, Response } from 'express';
import { settingsService, SettingsType } from '../services/settings.service';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * Settings Routes
 * Manages family configuration settings
 */

/**
 * GET /api/v1/settings/:type
 * Get settings by type for the user's family
 */
router.get('/:type', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params;
    const familyId = req.user!.familyId;

    // Validate settings type
    const validTypes: SettingsType[] = ['integrations', 'features', 'calendar'];
    if (!validTypes.includes(type as SettingsType)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `Invalid settings type. Must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    const settings = await settingsService.getSettings(familyId, type as SettingsType);

    res.json({
      type,
      settings,
    });
  } catch (error: any) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to retrieve settings',
    });
  }
});

/**
 * PUT /api/v1/settings/:type
 * Update settings by type (admin only)
 */
router.put('/:type', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params;
    const { settings } = req.body;
    const familyId = req.user!.familyId;

    // Validate settings type
    const validTypes: SettingsType[] = ['integrations', 'features', 'calendar'];
    if (!validTypes.includes(type as SettingsType)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `Invalid settings type. Must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    if (!settings) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Settings data is required',
      });
      return;
    }

    await settingsService.updateSettings(familyId, type as SettingsType, settings);

    res.json({
      message: 'Settings updated successfully',
      type,
      settings,
    });
  } catch (error: any) {
    console.error('Update settings error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to update settings',
    });
  }
});

/**
 * GET /api/v1/settings
 * Get all settings for the user's family
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;

    const allSettings = await settingsService.getAllSettings(familyId);

    res.json({
      settings: allSettings,
    });
  } catch (error: any) {
    console.error('Get all settings error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to retrieve settings',
    });
  }
});

/**
 * POST /api/v1/settings/:type/reset
 * Reset settings to defaults (admin only)
 */
router.post(
  '/:type/reset',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { type } = req.params;
      const familyId = req.user!.familyId;

      // Validate settings type
      const validTypes: SettingsType[] = ['integrations', 'features', 'calendar'];
      if (!validTypes.includes(type as SettingsType)) {
        res.status(400).json({
          error: 'Bad Request',
          message: `Invalid settings type. Must be one of: ${validTypes.join(', ')}`,
        });
        return;
      }

      await settingsService.resetSettings(familyId, type as SettingsType);
      const settings = await settingsService.getSettings(familyId, type as SettingsType);

      res.json({
        message: 'Settings reset to defaults successfully',
        type,
        settings,
      });
    } catch (error: any) {
      console.error('Reset settings error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'Failed to reset settings',
      });
    }
  }
);

/**
 * POST /api/v1/settings/integrations/:integration/test
 * Test an integration connection
 */
router.post(
  '/integrations/:integration/test',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { integration } = req.params;
      const { credentials } = req.body;

      // Test connection based on integration type
      switch (integration) {
        case 'woocommerce':
          // Test WooCommerce connection
          if (!credentials?.storeUrl || !credentials?.consumerKey || !credentials?.consumerSecret) {
            res.status(400).json({
              error: 'Bad Request',
              message: 'Store URL, Consumer Key, and Consumer Secret are required',
            });
            return;
          }

          try {
            const WooCommerceRestApi = (await import('@woocommerce/woocommerce-rest-api')).default;
            const api = new WooCommerceRestApi({
              url: credentials.storeUrl,
              consumerKey: credentials.consumerKey,
              consumerSecret: credentials.consumerSecret,
              version: 'wc/v3',
            });

            // Test with a simple API call
            await api.get('system_status');

            res.json({
              success: true,
              message: 'WooCommerce connection successful',
            });
          } catch (error: any) {
            res.status(400).json({
              success: false,
              message: `WooCommerce connection failed: ${error.message}`,
            });
          }
          break;

        default:
          res.status(400).json({
            error: 'Bad Request',
            message: `Integration ${integration} does not support testing`,
          });
      }
    } catch (error: any) {
      console.error('Test integration error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'Failed to test integration',
      });
    }
  }
);

export default router;
