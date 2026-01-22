import express, { Request, Response } from 'express';
import { settingsService, SettingsType } from '../services/settings.service';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import os from 'os';
import fs from 'fs';
import path from 'path';
import knex from '../database/knex';

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

/**
 * GET /api/v1/settings/admin/server-stats
 * Get server statistics (admin only)
 */
router.get('/admin/server-stats', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get database size
    const getDbSize = (): string => {
      try {
        const dbPath = process.env.DATABASE_PATH || '/app/data/lumina.db';
        const stats = fs.statSync(dbPath);
        return (stats.size / 1024 / 1024).toFixed(2) + ' MB';
      } catch {
        return 'Unknown';
      }
    };

    // Get order count
    const orderCount = await knex('cached_orders').count('* as count').first();

    // Format uptime
    const uptimeSeconds = process.uptime();
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeFormatted = `${days}d ${hours}h ${minutes}m`;

    const stats = {
      uptime: {
        seconds: Math.floor(uptimeSeconds),
        formatted: uptimeFormatted,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
        total: Math.round(os.totalmem() / 1024 / 1024), // MB
        percentage: Math.round((process.memoryUsage().heapUsed / os.totalmem()) * 100),
      },
      database: {
        size: getDbSize(),
        orders: orderCount?.count || 0,
      },
      system: {
        platform: os.platform(),
        nodeVersion: process.version,
        cpus: os.cpus().length,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(stats);
  } catch (error: any) {
    console.error('Get server stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to retrieve server stats',
    });
  }
});

/**
 * GET /api/v1/settings/admin/error-logs
 * Get recent error logs (admin only)
 */
router.get('/admin/error-logs', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const logPath = process.env.LOG_PATH || '/app/data/backend.log';

    try {
      // Check if log file exists
      if (!fs.existsSync(logPath)) {
        res.json({
          logs: [],
          count: 0,
          message: 'No log file found yet',
          lastUpdated: new Date().toISOString(),
        });
        return;
      }

      // Read log file
      const logContent = fs.readFileSync(logPath, 'utf8');
      const allLines = logContent.split('\n').filter(line => line.trim());

      // Get last 200 lines and filter for errors/warnings
      const recentLines = allLines.slice(-200);
      const errorLines = recentLines.filter(line =>
        line.includes('ERROR') || line.includes('WARN') || line.includes('error:')
      );

      res.json({
        logs: errorLines.reverse(), // Most recent first
        count: errorLines.length,
        totalLines: recentLines.length,
        lastUpdated: new Date().toISOString(),
      });
    } catch (fileError: any) {
      res.json({
        logs: [],
        count: 0,
        error: fileError.message,
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error('Get error logs error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to retrieve error logs',
    });
  }
});

export default router;
