import express, { Request, Response } from 'express';
import { weatherService } from '../services/weather.service';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * Weather Routes
 * Handles OpenWeatherMap integration for current weather and forecasts
 * All routes require authentication
 */

/**
 * GET /api/v1/weather/current
 * Get current weather for the authenticated user's family
 */
router.get('/current', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;

    // Check if weather is enabled for this family
    const isEnabled = await weatherService.isEnabledForFamily(familyId);
    if (!isEnabled) {
      res.status(400).json({
        error: 'Feature Disabled',
        message: 'Weather feature is not enabled for your family. Enable it in Settings.',
      });
      return;
    }

    // Get current weather
    const weather = await weatherService.getCurrentWeather(familyId);

    if (!weather) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Weather data not available',
      });
      return;
    }

    res.json({
      weather,
      cached: false, // Could be enhanced to show cache status
    });
  } catch (error: any) {
    console.error('Get current weather error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to retrieve current weather',
    });
  }
});

/**
 * GET /api/v1/weather/forecast
 * Get 3-day weather forecast for the authenticated user's family
 */
router.get('/forecast', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;

    // Check if weather is enabled for this family
    const isEnabled = await weatherService.isEnabledForFamily(familyId);
    if (!isEnabled) {
      res.status(400).json({
        error: 'Feature Disabled',
        message: 'Weather feature is not enabled for your family. Enable it in Settings.',
      });
      return;
    }

    // Get weather forecast
    const forecast = await weatherService.getWeatherForecast(familyId);

    if (!forecast) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Weather forecast not available',
      });
      return;
    }

    res.json({
      forecast,
      cached: false,
    });
  } catch (error: any) {
    console.error('Get weather forecast error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to retrieve weather forecast',
    });
  }
});

/**
 * POST /api/v1/weather/test
 * Test OpenWeatherMap API connection with provided credentials
 * Admin only - used in Settings panel to validate API key before saving
 */
router.post('/test', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { apiKey, location } = req.body;

    if (!apiKey || !location) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'API key and location are required',
      });
      return;
    }

    // Test the API connection
    const result = await weatherService.testApiConnection(apiKey, location);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error('Test weather API error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to test weather API',
    });
  }
});

/**
 * GET /api/v1/weather/status
 * Get weather feature status for the authenticated user's family
 */
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;

    const isEnabled = await weatherService.isEnabledForFamily(familyId);
    const config = await weatherService.getWeatherConfig(familyId);

    res.json({
      enabled: isEnabled,
      configured: !!config,
      location: config?.location || null,
      units: config?.units || 'metric',
    });
  } catch (error: any) {
    console.error('Get weather status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to get weather status',
    });
  }
});

/**
 * POST /api/v1/weather/clear-cache
 * Manually clear weather cache for the authenticated user's family
 * Admin only
 */
router.post('/clear-cache', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Clear expired cache entries
    const cleared = await weatherService.clearExpiredCache();

    res.json({
      message: 'Cache cleared successfully',
      entriesRemoved: cleared,
    });
  } catch (error: any) {
    console.error('Clear weather cache error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to clear cache',
    });
  }
});

export default router;
