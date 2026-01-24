import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { featuresService } from '../services/features.service';

const router = express.Router();

/**
 * Features Routes
 * Provides feature status information for dynamic UI
 */

/**
 * GET /api/v1/features/status
 * Get status of all features for the authenticated user's family
 */
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;

    const status = await featuresService.getFeaturesStatus(familyId);

    res.json(status);
  } catch (error: any) {
    console.error('Get features status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to retrieve features status',
    });
  }
});

export default router;
