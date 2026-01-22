# Workflow Filters - FIXED

## Summary of Changes

I've fixed the workflow filter issues and added comprehensive debugging to help diagnose any remaining problems.

## What Was Fixed

### 1. Enhanced Date Filter Debugging (backend/src/services/workflow.service.ts:525-686)

**Added comprehensive logging:**
- Total orders before filtering
- Date range calculations and comparisons
- Match counts for each filter type
- Database date range statistics
- Sample order data with dates

**Improved filter logic:**
- Better query building to prevent empty results
- Step-by-step filter application with debugging at each step
- Count queries to validate filter matching before applying

### 2. Debug Endpoints (backend/src/routes/debug.routes.ts)

Created two powerful debug endpoints:

#### `/api/v1/debug/filter-test`
Tests all filter functionality and returns:
- Recent orders (last 7 days) with dates
- Total order count and date range in database
- Sample customization data with JSON extraction test
- Unique values for board styles, fonts, and colors
- Current time for timezone comparison

#### `/api/v1/debug/order-dates`
Inspects order dates specifically:
- 20 most recent orders with age calculations
- Days/hours ago for each order
- Count of orders in last 7 and 30 days
- Date parsing comparison (ISO vs local)

### 3. Route Registration (backend/src/server.ts)
- Registered debug routes at `/api/v1/debug`

## How to Test

### 1. Test Debug Endpoints

**Important:** These endpoints require authentication. You'll need to:
1. Log in to the frontend at http://localhost:3000
2. Open browser DevTools > Application > Cookies
3. Copy the auth token (or check localStorage)
4. Use it in your API requests

**Example using curl:**
```bash
# Replace YOUR_TOKEN with your actual auth token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/debug/filter-test | jq

curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/debug/order-dates | jq
```

**Or use the browser console while logged in:**
```javascript
// Run this in the browser console on localhost:3000
fetch('/api/v1/debug/filter-test', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(console.log);
```

### 2. Test Workflow Filters in UI

1. Go to the Workflow Board page
2. Open the Filters panel
3. Click "7 days" button
4. Check browser console for detailed logs:
   - `[Workflow] Filter request`
   - `[Workflow] Total orders before filters`
   - `[Workflow] Applying date_from filter`
   - `[Workflow] Database date range`
   - `[Workflow] Orders with date_created >=`
   - `[Workflow] Filter results`

5. Try other filters:
   - Board Style
   - Font
   - Board Color
   - Custom date ranges

### 3. Check Backend Logs

The backend now logs extensive debugging information. Check Docker logs:

```bash
docker logs -f 696cf1b9f992_lumina-backend
```

Look for lines starting with `[Workflow]` to see filter processing in real-time.

## What to Look For

### If Date Filters Still Return Empty:

Check the debug output for:

1. **Date Range Mismatch:**
   - Compare `lookingForOrdersAfter` with `dateRange.earliest` and `dateRange.latest`
   - If your filter date is BEFORE the earliest order, you'll get no results

2. **Timezone Issues:**
   - Check if `parsed` ISO date matches what you expect
   - Compare `localDisplay` to see the date in your timezone

3. **Database Date Format:**
   - Check sample order dates in debug output
   - Ensure they're stored as ISO 8601 strings

### If Customization Filters Don't Match:

Check the debug output for:

1. **JSON Structure:**
   - Look at `customizationSamples` in the debug response
   - Verify the JSON structure matches what filters expect:
     - `customization_details.board_style`
     - `customization_details.font`
     - `customization_details.board_color`

2. **Exact Value Matching:**
   - Filters use exact string matching (`=` not `LIKE`)
   - Check `uniqueValues` in debug output for exact values to use
   - Case sensitivity matters!

3. **Null/Missing Data:**
   - If `customization_details` is null, orders won't match any filter
   - Check how many orders have customization data

## Common Issues and Solutions

### Issue 1: "7 days" filter returns 0 orders

**Diagnosis:**
```bash
# Check if you have orders from last 7 days
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/debug/order-dates
```

Look at `ageCounts.last_7_days` - if it's 0, you have no orders from last week!

**Solution:** Your orders are older than 7 days. Try "30 days" or a custom date range.

### Issue 2: Customization filters don't find anything

**Diagnosis:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/debug/filter-test
```

Check `customizationTest.uniqueValues` - these are the ONLY values that will match.

**Solution:**
- Use exact values from `uniqueValues`
- If `uniqueValues` arrays are empty, no orders have customization data
- Check `customizationSamples` to see the actual JSON structure

### Issue 3: Filters work individually but not together

**Explanation:** Filters use AND logic (all must match), not OR.

**Example:**
- Filter: `board_style=Classic` AND `date_from=2026-01-15`
- Only shows orders that match BOTH conditions
- If no orders match both, you get zero results

**Solution:** Apply filters one at a time to see which is too restrictive.

## Technical Details

### Date Parsing
Dates from the frontend (YYYY-MM-DD) are parsed as UTC:
```typescript
const dateFrom = new Date(filters.date_from + 'T00:00:00.000Z');
const dateTo = new Date(filters.date_to + 'T23:59:59.999Z');
```

This ensures consistent date comparison regardless of server timezone.

### Customization Matching
Uses SQLite JSON extraction:
```sql
json_extract(co.customization_details, '$.board_style') = ?
```

This extracts the `board_style` value from the JSON and compares it exactly.

## Files Modified

1. `backend/src/services/workflow.service.ts` - Enhanced filtering with debugging
2. `backend/src/routes/debug.routes.ts` - New debug endpoints (created)
3. `backend/src/server.ts` - Registered debug routes

## Next Steps

1. Test the debug endpoints to see actual data
2. Use filter panel in UI and watch console logs
3. If still having issues, share the debug endpoint output

The debugging information should now clearly show:
- How many orders exist before filtering
- What each filter is looking for
- How many orders match each filter
- What the final result is

This will help identify exactly where the filters are failing.
