/**
 * Backfill Script: Extract Customization Details from Existing Orders
 *
 * This script processes all existing cached_orders and extracts customization
 * details from their raw_data JSON into the customization_details column.
 *
 * Usage:
 *   npm run build
 *   node dist/database/backfill-customizations.js
 */

import db from './knex';
import { extractCustomizationDetails } from '../utils/customization-extractor';

interface CachedOrder {
  id: number;
  family_id: number;
  woocommerce_order_id: number;
  customer_name: string;
  raw_data: string;
  customization_details: string | null;
}

interface BackfillStats {
  totalOrders: number;
  ordersWithCustomization: number;
  ordersWithoutCustomization: number;
  ordersUpdated: number;
  ordersFailed: number;
  errors: Array<{ orderId: number; error: string }>;
}

async function backfillCustomizations(): Promise<void> {
  console.log('=== Backfilling Customization Details ===\n');

  const stats: BackfillStats = {
    totalOrders: 0,
    ordersWithCustomization: 0,
    ordersWithoutCustomization: 0,
    ordersUpdated: 0,
    ordersFailed: 0,
    errors: [],
  };

  try {
    // Fetch all cached orders
    console.log('Fetching all cached orders...');
    const orders = await db('cached_orders')
      .select('id', 'family_id', 'woocommerce_order_id', 'customer_name', 'raw_data', 'customization_details')
      .orderBy('id', 'asc');

    stats.totalOrders = orders.length;
    console.log(`Found ${stats.totalOrders} orders to process\n`);

    // Process each order
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i] as CachedOrder;
      const progress = `[${i + 1}/${stats.totalOrders}]`;

      try {
        // Parse raw_data JSON
        const rawData = typeof order.raw_data === 'string'
          ? JSON.parse(order.raw_data)
          : order.raw_data;

        if (!rawData.line_items || rawData.line_items.length === 0) {
          console.log(`${progress} Order #${order.woocommerce_order_id} (${order.customer_name}): No line items`);
          stats.ordersWithoutCustomization++;
          continue;
        }

        // Extract customization details
        const customization = extractCustomizationDetails(rawData.line_items);

        if (customization) {
          // Update database with extracted customization
          await db('cached_orders')
            .where({ id: order.id })
            .update({
              customization_details: JSON.stringify(customization),
              updated_at: new Date(),
            });

          // Format summary for display
          const summary: string[] = [];
          if (customization.board_style) summary.push(customization.board_style);
          if (customization.font) summary.push(customization.font);
          if (customization.board_color) summary.push(customization.board_color);
          if (customization.number_of_names) summary.push(`${customization.number_of_names} names`);

          console.log(
            `${progress} Order #${order.woocommerce_order_id} (${order.customer_name}): ` +
            `✓ ${summary.join(' • ')}`
          );

          stats.ordersWithCustomization++;
          stats.ordersUpdated++;
        } else {
          console.log(`${progress} Order #${order.woocommerce_order_id} (${order.customer_name}): No customization`);
          stats.ordersWithoutCustomization++;
        }
      } catch (error: any) {
        console.error(
          `${progress} Order #${order.woocommerce_order_id} (${order.customer_name}): ✗ ERROR - ${error.message}`
        );
        stats.ordersFailed++;
        stats.errors.push({
          orderId: order.woocommerce_order_id,
          error: error.message,
        });
      }
    }

    // Print summary
    console.log('\n=== Backfill Complete ===');
    console.log(`Total orders processed: ${stats.totalOrders}`);
    console.log(`Orders with customization: ${stats.ordersWithCustomization} (${((stats.ordersWithCustomization / stats.totalOrders) * 100).toFixed(1)}%)`);
    console.log(`Orders without customization: ${stats.ordersWithoutCustomization} (${((stats.ordersWithoutCustomization / stats.totalOrders) * 100).toFixed(1)}%)`);
    console.log(`Orders updated: ${stats.ordersUpdated}`);
    console.log(`Orders failed: ${stats.ordersFailed}`);

    if (stats.errors.length > 0) {
      console.log('\nErrors:');
      stats.errors.forEach(({ orderId, error }) => {
        console.log(`  Order #${orderId}: ${error}`);
      });
    }

    console.log('\n✓ Backfill completed successfully\n');
  } catch (error: any) {
    console.error('\n✗ Backfill failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await db.destroy();
  }
}

// Run the backfill if this script is executed directly
if (require.main === module) {
  backfillCustomizations()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default backfillCustomizations;
