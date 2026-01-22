#!/usr/bin/env node
/**
 * Debug Sync Script
 * 
 * Runs a debug sync of recent orders to examine field extraction
 * 
 * Usage:
 *   npm run debug:sync
 *   DEBUG_CUSTOMIZATION=true npm run debug:sync
 */

import woocommerceService from '../services/woocommerce.service';
import db from '../database/knex';

async function debugSync() {
  console.log('=== Debug WooCommerce Sync ===\n');
  console.log('This will sync the last 7 days of orders with debug logging enabled.\n');

  // Enable debug mode
  process.env.DEBUG_CUSTOMIZATION = 'true';

  try {
    // Get all families
    const families = await db('families').select('id', 'name');

    if (families.length === 0) {
      console.log('No families found');
      process.exit(1);
    }

    console.log(`Found ${families.length} family(ies)\n`);

    // Sync orders for each family (last 7 days only for debugging)
    for (const family of families) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Syncing family: ${family.name} (ID: ${family.id})`);
      console.log(`${'='.repeat(80)}\n`);

      const result = await woocommerceService.syncOrdersForFamily(
        family.id,
        7 // Last 7 days only
      );

      console.log(`\nSync Results for ${family.name}:`);
      console.log(`  Orders processed: ${result.ordersProcessed}`);
      console.log(`  Orders created: ${result.ordersCreated}`);
      console.log(`  Orders updated: ${result.ordersUpdated}`);

      if (result.errors.length > 0) {
        console.warn(`  Errors: ${result.errors.length}`);
        result.errors.forEach((error, i) => {
          console.warn(`    ${i + 1}. ${error}`);
        });
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('Debug sync complete!');
    console.log(`${'='.repeat(80)}\n`);

    // Show some sample customization data
    console.log('\nSample Customization Data:\n');
    const samples = await db('cached_orders')
      .whereNotNull('customization_details')
      .orderBy('date_created', 'desc')
      .limit(5)
      .select('woocommerce_order_id', 'customer_name', 'customization_details');

    samples.forEach((order: any, i: number) => {
      console.log(`${i + 1}. Order #${order.woocommerce_order_id} - ${order.customer_name}`);
      try {
        const customization = JSON.parse(order.customization_details);
        Object.entries(customization).forEach(([key, value]) => {
          if (key !== 'raw_meta') {
            console.log(`   ${key}: ${JSON.stringify(value)}`);
          }
        });
      } catch (e) {
        console.log('   (Invalid JSON)');
      }
      console.log('');
    });

  } catch (error: any) {
    console.error('\n✗ Debug sync failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run the debug sync
if (require.main === module) {
  debugSync()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default debugSync;
