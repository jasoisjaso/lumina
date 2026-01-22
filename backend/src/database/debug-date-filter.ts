/**
 * Debug Date Filter Script
 * 
 * Examines actual date values in the database to troubleshoot date filtering
 */

import db from './knex';

async function debugDateFilter(): Promise<void> {
  console.log('=== Debugging Date Filter ===\n');

  try {
    // Get sample orders with their dates
    console.log('Recent orders with dates:\n');
    const orders = await db('cached_orders')
      .select('id', 'woocommerce_order_id', 'customer_name', 'date_created', 'date_modified')
      .orderBy('date_created', 'desc')
      .limit(10);

    orders.forEach((order: any, i: number) => {
      const created = new Date(order.date_created);
      const daysAgo = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`${i + 1}. Order #${order.woocommerce_order_id} - ${order.customer_name}`);
      console.log(`   Date Created: ${order.date_created}`);
      console.log(`   Parsed Date:  ${created.toLocaleString()}`);
      console.log(`   Days Ago:     ${daysAgo} days`);
      console.log('');
    });

    // Test date filter logic
    console.log('\n=== Testing Date Filter Logic ===\n');
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    console.log('Frontend sends date string:', dateStr);
    
    // Current (broken) approach
    const brokenDate = new Date(dateStr);
    brokenDate.setHours(0, 0, 0, 0);
    console.log('\nCurrent approach (local timezone):');
    console.log('  new Date("' + dateStr + '"):', brokenDate.toString());
    console.log('  toISOString():', brokenDate.toISOString());
    
    // Fixed approach - parse as UTC
    const fixedDate = new Date(dateStr + 'T00:00:00.000Z');
    console.log('\nFixed approach (UTC):');
    console.log('  new Date("' + dateStr + 'T00:00:00.000Z"):', fixedDate.toString());
    console.log('  toISOString():', fixedDate.toISOString());
    
    // Test 7 days ago filter
    console.log('\n=== Testing 7 Days Filter ===\n');
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];
    
    console.log('7 days ago date string:', sevenDaysStr);
    
    // Broken approach
    const brokenSevenDays = new Date(sevenDaysStr);
    brokenSevenDays.setHours(0, 0, 0, 0);
    console.log('\nCurrent approach:');
    console.log('  Filter would use:', brokenSevenDays.toISOString());
    
    // Count orders with broken filter
    const brokenCount = await db('cached_orders')
      .where('date_created', '>=', brokenSevenDays.toISOString())
      .count('* as count');
    console.log('  Orders found:', brokenCount[0].count);
    
    // Fixed approach
    const fixedSevenDays = new Date(sevenDaysStr + 'T00:00:00.000Z');
    console.log('\nFixed approach:');
    console.log('  Filter would use:', fixedSevenDays.toISOString());
    
    // Count orders with fixed filter
    const fixedCount = await db('cached_orders')
      .where('date_created', '>=', fixedSevenDays.toISOString())
      .count('* as count');
    console.log('  Orders found:', fixedCount[0].count);
    
    // Show the difference
    console.log('\n=== Comparison ===');
    console.log('Broken approach finds:', brokenCount[0].count, 'orders');
    console.log('Fixed approach finds:', fixedCount[0].count, 'orders');
    console.log('Difference:', Number(fixedCount[0].count) - Number(brokenCount[0].count), 'orders');
    
    // Show date range of all orders
    const dateRange = await db('cached_orders')
      .select(
        db.raw('MIN(date_created) as earliest'),
        db.raw('MAX(date_created) as latest'),
        db.raw('COUNT(*) as total')
      )
      .first();
    
    console.log('\n=== Database Date Range ===');
    console.log('Earliest order:', dateRange.earliest);
    console.log('Latest order:', dateRange.latest);
    console.log('Total orders:', dateRange.total);

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
  debugDateFilter()
    .then(() => {
      console.log('\nDone!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default debugDateFilter;
