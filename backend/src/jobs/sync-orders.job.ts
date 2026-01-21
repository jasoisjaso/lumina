import woocommerceService from '../services/woocommerce.service';
import db from '../database/knex';

/**
 * Background Job: Sync WooCommerce Orders
 * Periodically syncs orders from WooCommerce to local cache for all families
 */

export class SyncOrdersJob {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private syncIntervalMinutes: number;
  private daysToSync: number;

  constructor(syncIntervalMinutes: number = 30, daysToSync: number = 30) {
    this.syncIntervalMinutes = syncIntervalMinutes;
    this.daysToSync = daysToSync;
  }

  /**
   * Start the periodic sync job
   */
  start(): void {
    if (this.intervalId) {
      console.log('WooCommerce sync job is already running');
      return;
    }

    console.log(`Starting WooCommerce sync job (interval: ${this.syncIntervalMinutes} minutes)`);

    // Run immediately on start
    this.runSync();

    // Schedule periodic syncs
    const intervalMs = this.syncIntervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runSync();
    }, intervalMs);
  }

  /**
   * Stop the periodic sync job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('WooCommerce sync job stopped');
    }
  }

  /**
   * Get job status
   */
  getStatus(): { running: boolean; syncing: boolean; intervalMinutes: number } {
    return {
      running: this.intervalId !== null,
      syncing: this.isRunning,
      intervalMinutes: this.syncIntervalMinutes,
    };
  }

  /**
   * Run a single sync cycle for all families
   */
  private async runSync(): Promise<void> {
    if (this.isRunning) {
      console.log('Sync already in progress, skipping this cycle');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('=== Starting WooCommerce Sync ===');

      // Get all families
      const families = await db('families').select('id', 'name');

      if (families.length === 0) {
        console.log('No families found, skipping sync');
        return;
      }

      console.log(`Syncing orders for ${families.length} family(ies)`);

      let totalOrdersProcessed = 0;
      let totalOrdersCreated = 0;
      let totalOrdersUpdated = 0;
      const familyErrors: { [key: string]: string[] } = {};

      // Sync orders for each family
      for (const family of families) {
        try {
          console.log(`Syncing family: ${family.name} (ID: ${family.id})`);

          const result = await woocommerceService.syncOrdersForFamily(
            family.id,
            this.daysToSync
          );

          totalOrdersProcessed += result.ordersProcessed;
          totalOrdersCreated += result.ordersCreated;
          totalOrdersUpdated += result.ordersUpdated;

          if (result.errors.length > 0) {
            familyErrors[family.name] = result.errors;
          }

          console.log(
            `  ✓ Family ${family.name}: ${result.ordersProcessed} orders processed ` +
            `(${result.ordersCreated} created, ${result.ordersUpdated} updated)`
          );
        } catch (error: any) {
          console.error(`  ✗ Failed to sync family ${family.name}:`, error.message);
          familyErrors[family.name] = [error.message];
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('=== Sync Summary ===');
      console.log(`Duration: ${duration}s`);
      console.log(`Families synced: ${families.length}`);
      console.log(`Total orders processed: ${totalOrdersProcessed}`);
      console.log(`Orders created: ${totalOrdersCreated}`);
      console.log(`Orders updated: ${totalOrdersUpdated}`);

      if (Object.keys(familyErrors).length > 0) {
        console.warn('Errors occurred during sync:');
        for (const [familyName, errors] of Object.entries(familyErrors)) {
          console.warn(`  ${familyName}:`, errors);
        }
      }

      console.log('=== Sync Complete ===\n');
    } catch (error: any) {
      console.error('Sync job failed:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Trigger an immediate sync (can be called manually)
   */
  async triggerSync(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Sync already in progress');
    }

    console.log('Manual sync triggered');
    await this.runSync();
  }
}

// Export a singleton instance
export const syncOrdersJob = new SyncOrdersJob(
  parseInt(process.env.SYNC_INTERVAL || '30'), // Default: 30 minutes
  parseInt(process.env.SYNC_DAYS_BACK || '730') // Default: 730 days (2 years) to get all orders
);

export default syncOrdersJob;
