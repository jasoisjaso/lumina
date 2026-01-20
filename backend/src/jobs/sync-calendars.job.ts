import { googleCalendarService } from '../services/google-calendar.service';
import knex from '../database/knex';
import { config } from '../config';

/**
 * Calendar Sync Job
 * Periodically syncs Google Calendar events for all connected users
 */

class SyncCalendarsJob {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Start the sync job
   */
  start(): void {
    if (!config.google.clientId || !config.google.clientSecret) {
      console.log('Google Calendar sync job disabled: API not configured');
      return;
    }

    const intervalMs = config.sync.intervalMinutes * 60 * 1000;
    console.log(
      `Google Calendar sync job will run every ${config.sync.intervalMinutes} minutes`
    );

    // Run immediately on start
    this.runSync();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.runSync();
    }, intervalMs);
  }

  /**
   * Stop the sync job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Google Calendar sync job stopped');
    }
  }

  /**
   * Check if job is currently running
   */
  isActive(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Get sync status
   */
  getStatus(): { running: boolean; syncing: boolean; intervalMinutes: number } {
    return {
      running: this.intervalId !== null,
      syncing: this.isRunning,
      intervalMinutes: config.sync.intervalMinutes,
    };
  }

  /**
   * Manually trigger sync
   */
  async triggerSync(): Promise<void> {
    if (this.isRunning) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    await this.runSync();
  }

  /**
   * Run the sync process
   */
  private async runSync(): Promise<void> {
    if (this.isRunning) {
      console.log('Calendar sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('Starting Google Calendar sync...');

      // Get all users with connected Google Calendar
      const connectedUsers = await knex('calendar_sync_tokens')
        .where({ provider: 'google' })
        .select('user_id', 'family_id');

      if (connectedUsers.length === 0) {
        console.log('No users with connected Google Calendar');
        return;
      }

      console.log(`Syncing calendars for ${connectedUsers.length} user(s)...`);

      let totalEventsCreated = 0;
      let totalEventsUpdated = 0;
      let totalErrors = 0;

      // Sync each user's calendar
      for (const { user_id, family_id } of connectedUsers) {
        try {
          console.log(`Syncing calendar for user ${user_id}...`);

          const result = await googleCalendarService.syncEventsForUser(
            user_id,
            family_id
          );

          totalEventsCreated += result.eventsCreated;
          totalEventsUpdated += result.eventsUpdated;

          if (result.errors.length > 0) {
            totalErrors += result.errors.length;
            console.error(`Errors for user ${user_id}:`, result.errors);
          }

          console.log(
            `User ${user_id}: ${result.eventsCreated} created, ${result.eventsUpdated} updated`
          );
        } catch (error: any) {
          totalErrors++;
          console.error(`Failed to sync calendar for user ${user_id}:`, error.message);
          // Continue with next user even if this one fails
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(
        `Calendar sync completed in ${duration}s: ${totalEventsCreated} created, ${totalEventsUpdated} updated, ${totalErrors} errors`
      );
    } catch (error: any) {
      console.error('Calendar sync error:', error);
    } finally {
      this.isRunning = false;
    }
  }
}

// Export singleton instance
export const syncCalendarsJob = new SyncCalendarsJob();
