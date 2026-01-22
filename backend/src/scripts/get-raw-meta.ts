/**
 * Diagnostic Script: Get Raw Meta Data
 *
 * This script fetches the last 5 orders and prints the raw meta_data
 * from the line items. This helps us see the exact field names and values
 * customers are providing at checkout.
 */
import db from '../database/knex';

interface CachedOrder {
  id: number;
  woocommerce_order_id: number;
  raw_data: string;
}

async function getRawMetaData() {
  console.log('=== Fetching Raw Meta Data for Last 25 Orders ===\n');

  try {
    const orders = await db('cached_orders')
      .select('woocommerce_order_id', 'raw_data', 'date_created')
      .orderBy('id', 'desc')
      .limit(25);

    if (orders.length === 0) {
      console.log('No orders found in the cache.');
      return;
    }

    console.log(`Found ${orders.length} orders. Analyzing...\n`);

    for (const order of orders) {
      console.log('--------------------------------------------------');
      console.log(`- Order ID: ${order.woocommerce_order_id}`);
      console.log(`- Date Created: ${order.date_created}`);
      console.log('--------------------------------------------------');

      try {
        const rawData = JSON.parse(order.raw_data);
        if (!rawData.line_items || rawData.line_items.length === 0) {
          console.log('  (No line items found for this order)\n');
          continue;
        }

        rawData.line_items.forEach((item: any, index: number) => {
          console.log(`  [Item ${index + 1}: ${item.name}]`);

          if (!item.meta_data || item.meta_data.length === 0) {
            console.log('    (No meta_data for this item)');
            return;
          }

          console.log('    Meta Data Fields:');
          item.meta_data.forEach((meta: any) => {
            // Sanitize display value to keep log clean
            let displayValue = meta.display_value;
            if (typeof displayValue === 'string' && displayValue.length > 100) {
              displayValue = displayValue.substring(0, 97) + '...';
            }

            console.log(`      - Key: "${meta.display_key}"`);
            console.log(`        Value: "${displayValue}"`);
          });
        });
        console.log(''); // Newline for readability

      } catch (e: any) {
        console.log(`  (Error parsing raw_data for this order: ${e.message})\n`);
      }
    }
  } catch (error: any) {
    console.error(`\n[ERROR] Failed to fetch orders: ${error.message}`);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

getRawMetaData();
