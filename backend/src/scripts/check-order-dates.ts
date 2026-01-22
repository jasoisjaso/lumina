/**
 * Quick script to check order dates in the database
 */

import knex from '../database/knex';

async function checkOrderDates() {
  try {
    console.log('=== Checking Order Dates ===\n');

    // Get date range
    const dateRange = await knex('cached_orders')
      .select(
        knex.raw('MIN(date_created) as earliest'),
        knex.raw('MAX(date_created) as latest'),
        knex.raw('COUNT(*) as total')
      )
      .first();

    console.log('Date Range:');
    console.log('  Earliest:', dateRange?.earliest);
    console.log('  Latest:', dateRange?.latest);
    console.log('  Total Orders:', dateRange?.total);
    console.log('');

    // Get recent orders
    const recentOrders = await knex('cached_orders')
      .select('id', 'woocommerce_order_id', 'customer_name', 'date_created')
      .orderBy('date_created', 'desc')
      .limit(10);

    console.log('10 Most Recent Orders:');
    recentOrders.forEach((order: any, i: number) => {
      const created = new Date(order.date_created);
      const daysAgo = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`  ${i + 1}. Order #${order.woocommerce_order_id} - ${order.customer_name}`);
      console.log(`     Date: ${order.date_created} (${daysAgo} days ago)`);
    });
    console.log('');

    // Check last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7Days = await knex('cached_orders')
      .where('date_created', '>=', sevenDaysAgo.toISOString())
      .count('* as count')
      .first();

    console.log('Orders in last 7 days:', last7Days?.count);

    // Check last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const last30Days = await knex('cached_orders')
      .where('date_created', '>=', thirtyDaysAgo.toISOString())
      .count('* as count')
      .first();

    console.log('Orders in last 30 days:', last30Days?.count);

    // Check customization data
    const withCustomization = await knex('cached_orders')
      .whereNotNull('customization_details')
      .count('* as count')
      .first();

    console.log('\nOrders with customization data:', withCustomization?.count);

    // Sample customization
    const sampleCustomization = await knex('cached_orders')
      .whereNotNull('customization_details')
      .select('id', 'woocommerce_order_id', 'customization_details')
      .limit(3);

    console.log('\nSample Customization Data:');
    sampleCustomization.forEach((order: any) => {
      console.log(`  Order #${order.woocommerce_order_id}:`, order.customization_details?.substring(0, 100) + '...');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await knex.destroy();
  }
}

checkOrderDates();
