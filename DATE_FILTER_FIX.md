# Date Filter Fix - Timezone Issue

## The Problem

When you clicked "7 days" or "30 days", the filter showed no orders even though orders existed. This was caused by **timezone conversion** when comparing dates.

## What Was Happening (Before Fix)

1. **Frontend** sends date string: `"2026-01-15"` (just the date, no time)
2. **Backend** creates Date object: `new Date("2026-01-15")`
   - This creates midnight **in your local timezone** (e.g., 2026-01-15 00:00:00 PST)
3. **Backend** calls `setHours(0, 0, 0, 0)` - still local timezone
4. **Backend** converts to ISO string for database query: `toISOString()`
   - If you're in PST (UTC-8), this becomes: `"2026-01-15T08:00:00.000Z"`
   - **The date SHIFTED 8 hours forward into the next day in UTC!**
5. **Database** has order created at: `"2026-01-15T05:00:00.000Z"` (5am UTC = 9pm PST previous day)
6. **Comparison fails**: `05:00 < 08:00` ❌ Order is excluded!

### Visual Example

```
You want orders from Jan 15, 2026 onwards:

Database has order at:
├─ "2026-01-15T05:00:00.000Z" (5am UTC)
└─ This is Jan 14, 2026 at 9pm PST

Broken filter checks:
├─ date_created >= "2026-01-15T08:00:00.000Z" (8am UTC = midnight PST)
└─ Result: 05:00 < 08:00 = FALSE ❌ Order excluded!

This is why orders disappeared!
```

## The Fix

Parse the date string **as UTC** instead of local timezone:

```typescript
// BEFORE (Broken)
const dateFrom = new Date(filters.date_from); // "2026-01-15" becomes local midnight
dateFrom.setHours(0, 0, 0, 0);                // Still local timezone
queryBuilder.where('co.date_created', '>=', dateFrom.toISOString()); 
// PST → "2026-01-15T08:00:00.000Z" (shifted!)

// AFTER (Fixed)
const dateFrom = new Date(filters.date_from + 'T00:00:00.000Z'); 
// "2026-01-15T00:00:00.000Z" (UTC midnight, no shifting!)
queryBuilder.where('co.date_created', '>=', dateFrom.toISOString());
// → "2026-01-15T00:00:00.000Z" (correct!)
```

## How to Apply the Fix

1. **Rebuild the backend**:
```bash
cd backend
npm run build
```

2. **Restart the backend server**:
```bash
# If using docker-compose
docker-compose restart backend

# OR if running directly
npm start
```

3. **Test the filter**:
   - Open Workflow Board
   - Click "7 days" or "30 days"
   - Orders should now appear!

## Technical Details

### Date Parsing Comparison

| Input String | Old Code | New Code |
|--------------|----------|----------|
| `"2026-01-15"` | `new Date("2026-01-15")` → Local midnight | `new Date("2026-01-15T00:00:00.000Z")` → UTC midnight |
| PST Conversion | `"2026-01-15T00:00:00-08:00"` → `"2026-01-15T08:00:00Z"` | `"2026-01-15T00:00:00Z"` (no conversion needed) |
| Result | **8 hours shifted forward** ❌ | **Correct UTC time** ✅ |

### Why UTC Makes Sense

1. **WooCommerce stores dates in UTC** (ISO 8601 format with Z suffix)
2. **Database stores ISO strings** which are UTC by convention
3. **Filtering should be timezone-independent** - "orders from Jan 15" means Jan 15 anywhere in the world
4. **UTC prevents daylight saving issues** - no shifting when clocks change

## Debug Output

The fix includes enhanced logging. Check your backend console for:

```
[Workflow] Applying date_from filter: {
  received: '2026-01-15',
  parsed: '2026-01-15T00:00:00.000Z',
  localDisplay: '1/15/2026, 12:00:00 AM'
}
[Workflow] Filter results: { totalOrders: 42, sampleOrderId: 4791 }
```

This helps verify:
- What date string was received from frontend
- What UTC timestamp is being used for filtering
- How many orders matched the filter

## Files Modified

- `backend/src/services/workflow.service.ts` (lines 607-625)

## No Frontend Changes Needed

The frontend already sends dates in the correct format (`YYYY-MM-DD`). Only the backend parsing logic changed.

## Testing Checklist

- [ ] "7 days" filter shows recent orders
- [ ] "30 days" filter shows orders from last month
- [ ] Custom date range works correctly
- [ ] Combining date filter with other filters (board style, font, color) works
- [ ] Orders from different timezones display correctly

## Why This Happened

This is a classic **timezone conversion bug** that happens when:
1. Frontend and backend are in different timezones
2. Dates are passed as strings without timezone info
3. JavaScript `new Date()` defaults to local timezone
4. Database uses UTC for timestamps

The fix ensures we always use UTC for date comparisons, which is the standard for web applications.
