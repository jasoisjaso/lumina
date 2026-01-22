import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import knex from '../database/knex';

const router = Router();

/**
 * GET /api/v1/debug/filter-test
 * Debug endpoint to inspect filter data and test date filtering
 */
router.get('/filter-test', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;

    // Calculate 7 days ago
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sevenDaysAgoTimestamp = sevenDaysAgo.getTime(); // Convert to milliseconds timestamp

    // Get recent orders (last 7 days)
    const recentOrders = await knex('cached_orders')
      .where({ family_id: familyId })
      .where('date_created', '>=', sevenDaysAgoTimestamp)
      .orderBy('date_created', 'desc')
      .limit(10)
      .select('id', 'woocommerce_order_id', 'customer_name', 'date_created', 'customization_details');

    // Get all orders count
    const totalOrders = await knex('cached_orders')
      .where({ family_id: familyId })
      .count('* as count')
      .first();

    // Get orders with customization data
    const ordersWithCustomization = await knex('cached_orders')
      .where({ family_id: familyId })
      .whereNotNull('customization_details')
      .limit(5)
      .select('id', 'woocommerce_order_id', 'customization_details');

    // Parse customization samples
    const customizationSamples = ordersWithCustomization.map((order: any) => {
      let parsed = null;
      try {
        parsed = typeof order.customization_details === 'string'
          ? JSON.parse(order.customization_details)
          : order.customization_details;
      } catch (e) {
        parsed = { error: 'Failed to parse JSON' };
      }
      return {
        order_id: order.id,
        wc_order_id: order.woocommerce_order_id,
        customization: parsed,
      };
    });

    // Get date range of all orders
    const dateRange = await knex('cached_orders')
      .where({ family_id: familyId })
      .select(
        knex.raw('MIN(date_created) as earliest'),
        knex.raw('MAX(date_created) as latest')
      )
      .first();

    // Test JSON extraction for board_style
    const boardStyleTest = await knex('cached_orders')
      .where({ family_id: familyId })
      .whereNotNull('customization_details')
      .select(
        'id',
        knex.raw("json_extract(customization_details, '$.board_style') as board_style"),
        knex.raw("json_extract(customization_details, '$.font') as font"),
        knex.raw("json_extract(customization_details, '$.board_color') as board_color")
      )
      .limit(10);

    // Get unique values for filters
    const uniqueValues = {
      board_styles: [...new Set(boardStyleTest.map((o: any) => o.board_style).filter(Boolean))],
      fonts: [...new Set(boardStyleTest.map((o: any) => o.font).filter(Boolean))],
      board_colors: [...new Set(boardStyleTest.map((o: any) => o.board_color).filter(Boolean))],
    };

    res.json({
      message: 'Filter Debug Info',
      currentTime: now.toISOString(),
      dateTest: {
        lookingForOrdersAfter: sevenDaysAgo.toISOString(),
        lookingForOrdersAfterTimestamp: sevenDaysAgoTimestamp,
        foundCount: recentOrders.length,
        sampleOrders: recentOrders.map((o: any) => ({
          id: o.id,
          wc_order_id: o.woocommerce_order_id,
          customer: o.customer_name,
          date_created_timestamp: o.date_created,
          date_created_readable: new Date(o.date_created).toISOString(),
        })),
      },
      databaseStats: {
        totalOrders: totalOrders?.count || 0,
        dateRange: {
          earliestTimestamp: dateRange?.earliest,
          earliestDate: dateRange?.earliest ? new Date(dateRange.earliest).toISOString() : null,
          latestTimestamp: dateRange?.latest,
          latestDate: dateRange?.latest ? new Date(dateRange.latest).toISOString() : null,
        },
      },
      customizationTest: {
        samplesWithData: customizationSamples,
        jsonExtractionTest: boardStyleTest,
        uniqueValues,
      },
    });
  } catch (error: any) {
    console.error('Debug filter test error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: error.stack,
    });
  }
});

/**
 * GET /api/v1/debug/order-dates
 * Debug endpoint to check order date values
 */
router.get('/order-dates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user!.familyId;

    // Get sample of orders with their dates
    const orders = await knex('cached_orders')
      .where({ family_id: familyId })
      .orderBy('date_created', 'desc')
      .limit(20)
      .select('id', 'woocommerce_order_id', 'customer_name', 'date_created', 'date_modified');

    // Calculate days ago for each order
    const now = Date.now();
    const ordersWithAge = orders.map((order: any) => {
      const created = new Date(order.date_created);
      const daysAgo = Math.floor((now - created.getTime()) / (1000 * 60 * 60 * 24));
      const hoursAgo = Math.floor((now - created.getTime()) / (1000 * 60 * 60));

      return {
        id: order.id,
        wc_order_id: order.woocommerce_order_id,
        customer: order.customer_name,
        date_created: order.date_created,
        date_created_parsed: created.toISOString(),
        date_created_local: created.toLocaleString(),
        days_ago: daysAgo,
        hours_ago: hoursAgo,
      };
    });

    // Count orders by age
    const sevenDaysAgoDate = new Date();
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
    const sevenDaysAgoTimestamp = sevenDaysAgoDate.getTime();

    const thirtyDaysAgoDate = new Date();
    thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);
    const thirtyDaysAgoTimestamp = thirtyDaysAgoDate.getTime();

    const last7Days = await knex('cached_orders')
      .where({ family_id: familyId })
      .where('date_created', '>=', sevenDaysAgoTimestamp)
      .count('* as count')
      .first();

    const last30Days = await knex('cached_orders')
      .where({ family_id: familyId })
      .where('date_created', '>=', thirtyDaysAgoTimestamp)
      .count('* as count')
      .first();

    res.json({
      message: 'Order Dates Debug',
      currentTime: new Date().toISOString(),
      orders: ordersWithAge,
      ageCounts: {
        last_7_days: last7Days?.count || 0,
        last_30_days: last30Days?.count || 0,
      },
    });
  } catch (error: any) {
    console.error('Debug order dates error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

export default router;
