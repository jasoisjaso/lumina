import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database/knex';
import authService from '../services/auth.service';
import settingsService from '../services/settings.service';

const router = Router();

/**
 * Setup Wizard API Routes
 * First-time deployment configuration
 */

/**
 * GET /api/v1/setup/status
 * Check if setup is needed (no families exist)
 * Public endpoint
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const familyCount = await db('families').count('* as count').first();
    const setupNeeded = !familyCount || parseInt(familyCount.count as string) === 0;

    res.status(200).json({
      setupNeeded,
      message: setupNeeded ? 'Setup required' : 'Setup already completed',
    });
  } catch (error: any) {
    console.error('Setup status check error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to check setup status',
    });
  }
});

/**
 * POST /api/v1/setup/initialize
 * Complete initial setup (atomic transaction)
 * Creates family, admin user, and optionally configures integrations
 * Public endpoint
 */
router.post('/initialize', async (req: Request, res: Response): Promise<void> => {
  const trx = await db.transaction();

  try {
    // Check if setup already completed
    const familyCount = await trx('families').count('* as count').first();
    if (familyCount && parseInt(familyCount.count as string) > 0) {
      await trx.rollback();
      res.status(409).json({
        error: 'Conflict',
        message: 'Setup already completed',
      });
      return;
    }

    const {
      // Family details
      familyName,
      timezone = 'UTC',

      // Admin account
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,

      // Optional integrations
      weatherApiKey,
      weatherLocation,
      weatherUnits = 'metric',

      woocommerceStoreUrl,
      woocommerceConsumerKey,
      woocommerceConsumerSecret,
    } = req.body;

    // Validate required fields
    if (!familyName || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
      await trx.rollback();
      res.status(400).json({
        error: 'Validation Error',
        message: 'Family name, admin email, password, first name, and last name are required',
      });
      return;
    }

    // Validate password strength
    if (adminPassword.length < 8) {
      await trx.rollback();
      res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 8 characters long',
      });
      return;
    }

    // Create family
    const [familyData] = await trx('families').insert({
      name: familyName,
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('id');
    const familyId = (typeof familyData === 'number') ? familyData : familyData.id;


    // Hash admin password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const [userData] = await trx('users').insert({
      family_id: familyId,
      email: adminEmail.toLowerCase(),
      password_hash: passwordHash,
      first_name: adminFirstName,
      last_name: adminLastName,
      role: 'admin',
      status: 'active',
      color: '#4F46E5', // Indigo color for first user
      created_at: new Date(),
      updated_at: new Date(),
    }).returning('id');
    const userId = (typeof userData === 'number') ? userData : userData.id;

    // Configure integrations if provided
    const integrationSettings: any = {
      woocommerce: {
        enabled: false,
      },
      googleCalendar: {
        enabled: false,
        connected: false,
      },
      icloudCalendar: {
        enabled: false,
      },
    };

    // Configure WooCommerce if credentials provided
    if (woocommerceStoreUrl && woocommerceConsumerKey && woocommerceConsumerSecret) {
      integrationSettings.woocommerce = {
        enabled: true,
        storeUrl: woocommerceStoreUrl,
        consumerKey: woocommerceConsumerKey,
        consumerSecret: woocommerceConsumerSecret,
      };
    }

    // Save integration settings
    await trx('family_settings').insert({
      family_id: familyId,
      settings_type: 'integrations',
      settings_data: JSON.stringify(integrationSettings),
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Configure features
    const featureSettings: any = {
      chores: {
        enabled: false,
      },
      weather: {
        enabled: false,
      },
      photoGallery: {
        enabled: true, // Always enable photo gallery
      },
    };

    // Configure Weather if API key provided
    if (weatherApiKey && weatherLocation) {
      featureSettings.weather = {
        enabled: true,
        apiKey: weatherApiKey,
        location: weatherLocation,
        units: weatherUnits,
      };
    }

    // Save feature settings
    await trx('family_settings').insert({
      family_id: familyId,
      settings_type: 'features',
      settings_data: JSON.stringify(featureSettings),
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Save calendar settings (default)
    await trx('family_settings').insert({
      family_id: familyId,
      settings_type: 'calendar',
      settings_data: JSON.stringify({
        defaultView: 'month',
        weekStartsOn: 0, // Sunday
        timezone: timezone,
      }),
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Commit transaction
    await trx.commit();

    // Generate auth tokens for admin user
    const tokenPayload = {
      userId: userId,
      email: adminEmail.toLowerCase(),
      familyId: familyId,
      role: 'admin',
    };

    const accessToken = authService.generateAccessToken(tokenPayload);
    const refreshToken = authService.generateRefreshToken(tokenPayload);

    const user = {
      id: userId,
      email: adminEmail.toLowerCase(),
      first_name: adminFirstName,
      last_name: adminLastName,
      family_id: familyId,
      role: 'admin',
      color: '#4F46E5',
    };

    res.status(201).json({
      message: 'Setup completed successfully',
      user,
      tokens: {
        accessToken,
        refreshToken,
      },
      family: {
        id: familyId,
        name: familyName,
      },
    });
  } catch (error: any) {
    await trx.rollback();
    console.error('Setup initialization error:', error);

    // Handle unique constraint violations and other db errors
    if (error.code === 'SQLITE_CONSTRAINT' || error.code === '23505') {
      if (error.message.includes('FOREIGN KEY')) {
        res.status(500).json({
          error: 'Database Error',
          message: 'A foreign key constraint failed. This is an internal server issue.',
          details: error.message,
        });
      } else if (error.message.includes('UNIQUE')) {
        // This can happen in a race condition (e.g., double-click on setup button).
        // Check if a family was created by a concurrent request.
        const familyCheck = await db('families').count('* as count').first();
        if (familyCheck && parseInt(familyCheck.count as string) > 0) {
          res.status(409).json({
            error: 'Conflict',
            message: 'Setup appears to have just been completed. Please try logging in.',
          });
        } else {
          res.status(409).json({
            error: 'Conflict',
            message: 'Email address already in use.',
          });
        }
      } else {
         res.status(500).json({
          error: 'Database Error',
          message: 'A database constraint was violated.',
          details: error.message,
        });
      }
      return;
    }

    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to complete setup',
      details: error.message,
    });
  }
});

/**
 * POST /api/v1/setup/validate-email
 * Check if email is available
 * Public endpoint
 */
router.post('/validate-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Email is required',
      });
      return;
    }

    const existingUser = await db('users')
      .where({ email: email.toLowerCase() })
      .first();

    res.status(200).json({
      available: !existingUser,
      message: existingUser ? 'Email already in use' : 'Email is available',
    });
  } catch (error: any) {
    // If the 'users' table does not exist, it means this is the first setup,
    // so the email is considered available.
    if (error.message && error.message.includes('SQLITE_ERROR: no such table: users')) {
      console.warn('SQLITE_ERROR: No such table users during email validation. Assuming email is available for initial setup.');
      res.status(200).json({
        available: true,
        message: 'Email is available (initial setup)',
      });
      return;
    }

    console.error('Email validation error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to validate email',
      details: error.message, // Include error details for better debugging
    });
  }
});

export default router;
