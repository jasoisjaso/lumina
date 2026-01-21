import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from 'redis';
import { config } from './config';
import authRoutes from './routes/auth.routes';
import ordersRoutes from './routes/orders.routes';
import eventsRoutes from './routes/events.routes';
import familiesRoutes from './routes/families.routes';
import usersRoutes from './routes/users.routes';
import calendarSyncRoutes from './routes/calendar-sync.routes';
import calendarSharingRoutes from './routes/calendar-sharing-settings.routes';
import settingsRoutes from './routes/settings.routes';
import userSettingsRoutes from './routes/user-settings.routes';
import weatherRoutes from './routes/weather.routes';
import icloudCalendarRoutes from './routes/icloud-calendar.routes';
import photoGalleryRoutes from './routes/photo-gallery.routes';
import setupRoutes from './routes/setup.routes';
import workflowRoutes from './routes/workflow.routes';
import { syncOrdersJob } from './jobs/sync-orders.job';
import { syncCalendarsJob } from './jobs/sync-calendars.job';

const app = express();
const port = config.port;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redis client
const redisClient = createClient({
  url: `redis://${config.redis.host}:${config.redis.port}`
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api' });
});

// Database health check
app.get('/api/v1/db/health', async (req, res) => {
  try {
    const knex = (await import('./database/knex')).default;
    await knex.raw('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      status: 'unhealthy',
      database: 'error',
      error: errorMessage
    });
  }
});

// API Routes
app.use('/api/v1/setup', setupRoutes); // Public setup wizard (before auth)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orders', ordersRoutes);
app.use('/api/v1/events', eventsRoutes);
app.use('/api/v1/families', familiesRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/calendar-sync', calendarSyncRoutes);
app.use('/api/v1/calendar-sharing', calendarSharingRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/user-settings', userSettingsRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/icloud-calendar', icloudCalendarRoutes);
app.use('/api/v1/photos', photoGalleryRoutes);
app.use('/api/v1/workflow', workflowRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

import { runMigrations } from './database/runMigrations';

// Connect to Redis and start server
async function startServer() {
  try {
    // Run database migrations on startup
    await runMigrations();

    await redisClient.connect();
    console.log('Connected to Redis');

    app.listen(port, () => {
      console.log(`Lumina backend server running on port ${port}`);
    });

    // Start WooCommerce sync job
    console.log('Starting WooCommerce sync job...');
    syncOrdersJob.start();

    // Start Google Calendar sync job
    console.log('Starting Google Calendar sync job...');
    syncCalendarsJob.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  syncOrdersJob.stop();
  syncCalendarsJob.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  syncOrdersJob.stop();
  syncCalendarsJob.stop();
  process.exit(0);
});

startServer();
