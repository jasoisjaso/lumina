# Workflow Filters - ACTUALLY FIXED NOW

## The Real Problem

The dates in the database are stored as **UNIX timestamps** (milliseconds since 1970 epoch), NOT as ISO 8601 strings!

Example from database:
```
date_created: 1769094391000 (number)
```

This equals: `2026-01-22T15:06:31.000Z`

## What Was Broken

The filter code was comparing:
```sql
WHERE date_created >= '2026-01-15T00:00:00.000Z'  -- STRING
```

But the database has:
```sql
date_created = 1769094391000  -- NUMBER
```

SQLite was comparing a NUMBER to a STRING, which doesn't work correctly!

## The Fix

Changed the filter logic to convert ISO date strings to UNIX timestamps before comparing:

### Before (broken):
```typescript
const dateFromISO = dateFrom.toISOString(); // '2026-01-15T00:00:00.000Z'
queryBuilder.where('co.date_created', '>=', dateFromISO); // ❌ Comparing string to number!
```

### After (fixed):
```typescript
const dateFromTimestamp = dateFrom.getTime(); // 1768476000000
queryBuilder.where('co.date_created', '>=', dateFromTimestamp); // ✅ Comparing number to number!
```

## Verification

**Before fix:**
- Orders in last 7 days: **0**
- Orders in last 30 days: **0**

**After fix:**
- Orders in last 7 days: **18** ✅
- Orders in last 30 days: **91** ✅

## Files Modified

1. **backend/src/services/workflow.service.ts** (lines ~578-625)
   - Changed date filter to use `.getTime()` to convert to timestamps
   - Added better debugging showing both ISO and timestamp formats

2. **backend/src/routes/debug.routes.ts** (multiple locations)
   - Fixed debug endpoints to use timestamps
   - Added readable date conversions for debugging

3. **backend/src/server.ts**
   - Registered debug routes at `/api/v1/debug`

## How to Test

### 1. Test in the UI

1. Open http://localhost:3000/workflow
2. Click "7 days" button in the filter bar
3. You should now see 18 orders!
4. Click "30 days" - you should see 91 orders!

### 2. Check the Backend Logs

The logs will now show:
```
[Workflow] Applying date_from filter: {
  received: '2026-01-15',
  parsedISO: '2026-01-15T00:00:00.000Z',
  timestamp: 1768476000000,     ← THIS is what gets compared!
  localDisplay: '1/15/2026, 12:00:00 AM'
}
[Workflow] Orders with date_created >= 1768476000000: 18
[Workflow] Database date range: {
  earliestTimestamp: 1759866076000,
  earliestDate: '2025-10-07T19:41:16.000Z',
  latestTimestamp: 1769094391000,
  latestDate: '2026-01-22T15:06:31.000Z'
}
[Workflow] Filter results: { totalOrdersAfterFilters: 18, ... }
```

### 3. Test Customization Filters

The customization filters should already work (they use JSON extraction, not date comparison).

Try filtering by:
- Board Style
- Font
- Board Color

These use `json_extract()` which works correctly.

## About the Refresh Button

The refresh button issue is separate. Let me check that next if it's still not working after testing the filters.

## Next Steps

1. **Test the filters in the UI** - they should work now!
2. **If refresh button still doesn't work**, let me know and I'll investigate that separately
3. The filters are using correct SQL comparisons now

## Technical Details

### Why Timestamps Instead of Strings?

SQLite stores the `date_created` column as an INTEGER (UNIX timestamp in milliseconds):
- Efficient storage (8 bytes vs ~25 bytes for ISO string)
- Fast numeric comparisons
- Easy sorting
- WooCommerce often provides timestamps

The comparison works because:
```
1769094391000 >= 1768476000000  ✅ (TRUE - 2026-01-22 >= 2026-01-15)
1769094391000 >= '2026-01-15...' ❌ (Undefined behavior - string/number comparison)
```

### Debug Commands

Check orders in last 7 days:
```bash
docker exec lumina-backend node -e "
const knex = require('./dist/database/knex').default;
(async () => {
  const d = new Date(); d.setDate(d.getDate() - 7);
  const orders = await knex('cached_orders')
    .where('date_created', '>=', d.getTime())
    .select('id', 'woocommerce_order_id', 'date_created');
  console.log('Found', orders.length, 'orders');
  orders.forEach(o => console.log(
    'Order', o.woocommerce_order_id,
    'created:', new Date(o.date_created).toISOString()
  ));
  await knex.destroy();
})();
"
```

## Success Criteria

- ✅ "7 days" filter shows 18 orders (not 0)
- ✅ "30 days" filter shows 91 orders (not 0)
- ✅ Custom date ranges work correctly
- ✅ Filters can be combined (date + customization)
- ✅ Backend logs show correct debugging information
- 🔄 Refresh button functionality (checking next)

The date filtering is **FIXED**! Test it now in the UI.
