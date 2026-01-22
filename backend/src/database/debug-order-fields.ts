/**
 * Debug Script: Examine actual order meta field names
 * 
 * This script analyzes sample orders to discover what meta field names
 * are actually being used by customers during checkout
 */

import db from './knex';

interface CachedOrder {
  id: number;
  woocommerce_order_id: number;
  customer_name: string;
  raw_data: string;
  customization_details: string | null;
}

async function debugOrderFields(): Promise<void> {
  console.log('=== Debugging Order Meta Fields ===\n');

  try {
    // Fetch sample orders
    console.log('Fetching 10 recent orders...\n');
    const orders = await db('cached_orders')
      .select('id', 'woocommerce_order_id', 'customer_name', 'raw_data', 'customization_details', 'date_created')
      .orderBy('date_created', 'desc')
      .limit(10);

    console.log(`Found ${orders.length} orders\n`);

    // Analyze each order
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i] as CachedOrder;
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Order #${order.woocommerce_order_id} - ${order.customer_name}`);
      console.log(`${'='.repeat(80)}`);

      try {
        const rawData = typeof order.raw_data === 'string'
          ? JSON.parse(order.raw_data)
          : order.raw_data;

        if (!rawData.line_items || rawData.line_items.length === 0) {
          console.log('  ⚠ No line items found');
          continue;
        }

        console.log(`\n  Line Items: ${rawData.line_items.length}`);

        // Show meta fields for each line item
        rawData.line_items.forEach((item: any, idx: number) => {
          console.log(`\n  Item ${idx + 1}: ${item.name}`);
          console.log(`  Quantity: ${item.quantity} | Total: $${item.total}`);

          if (item.meta_data && item.meta_data.length > 0) {
            console.log(`\n  Meta Fields (${item.meta_data.length}):`);
            item.meta_data.forEach((meta: any) => {
              const value = typeof meta.value === 'string' && meta.value.length > 50
                ? meta.value.substring(0, 50) + '...'
                : meta.value;
              console.log(`    • ${meta.key}: ${JSON.stringify(value)}`);
            });
          } else {
            console.log('  ⚠ No meta_data found');
          }
        });

        // Show what was extracted
        if (order.customization_details) {
          const customization = JSON.parse(order.customization_details);
          console.log(`\n  ✓ Extracted Customization:`);
          Object.entries(customization).forEach(([key, value]) => {
            if (key !== 'raw_meta') {
              console.log(`    • ${key}: ${JSON.stringify(value)}`);
            }
          });
        } else {
          console.log(`\n  ✗ No customization extracted`);
        }
      } catch (error: any) {
        console.error(`  ✗ ERROR parsing order: ${error.message}`);
      }
    }

    console.log(`\n\n${'='.repeat(80)}`);
    console.log('Debug complete!');
    console.log(`${'='.repeat(80)}\n`);
  } catch (error: any) {
    console.error('\n✗ Debug failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

// Run the debug script
if (require.main === module) {
  debugOrderFields()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default debugOrderFields;
