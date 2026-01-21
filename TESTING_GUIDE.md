# Testing Guide - WooCommerce Bi-Directional Sync

## Quick Status Check

Run this to verify everything is working:

```bash
docker-compose logs --tail=50 backend | grep -E "workflow stages|Detected WooCommerce"
```

You should see:
```
Detected WooCommerce statuses: [
  { status: 'processing', count: 6 },
  { status: 'checkout-draft', count: 1 },
  { status: 'design', count: 7 },
  { status: 'completed', count: 69 },
  { status: 'refunded', count: 4 },
  { status: 'failed', count: 1 }
]
Creating new workflow stage: Processing (processing)
Creating new workflow stage: Design (design)
Creating new workflow stage: Checkout draft (checkout-draft)
...
```

## Test 1: Verify Workflow Board Loads

1. Open Lumina in browser: http://localhost:3000
2. Log in if needed
3. Click **Workflow** tab in navigation
4. **Expected:** Workflow board loads with columns for each status:
   - Processing (6 orders)
   - Design (7 orders)
   - Checkout Draft (1 order)
   - Completed (69 orders)
   - Refunded (4 orders)
   - Failed (1 order)

## Test 2: Lumina → WooCommerce Sync (Drag Order)

### Step 1: Find an order in "Processing" stage
1. Open Lumina workflow board
2. Find an order in the "Processing" column
3. Note the order ID/number

### Step 2: Drag order to "Design" stage
1. Drag the order from "Processing" to "Design" column
2. Order should move visually

### Step 3: Verify in WooCommerce
1. Open WooCommerce admin: https://shop.jasodesign.com.au/wp-admin
2. Go to WooCommerce → Orders
3. Find the order you just moved
4. **Expected:** Order status should now be "Design"

### Step 4: Check backend logs
```bash
docker-compose logs --tail=20 backend | grep "Syncing order"
```

You should see:
```
Syncing order 4XXX status to WooCommerce: design
Successfully synced order 4XXX to WooCommerce
```

## Test 3: WooCommerce → Lumina Sync (Change in WooCommerce)

### Step 1: Find an order in WooCommerce
1. Open WooCommerce admin
2. Go to WooCommerce → Orders
3. Find an order that's currently "Design"

### Step 2: Change status in WooCommerce
1. Click Edit on the order
2. Change "Order status" dropdown to "Completed"
3. Click "Update" button

### Step 3: Trigger sync (or wait 30 minutes)
Option A - Wait for automatic sync (runs every 30 minutes)
Option B - Restart backend to trigger immediate sync:
```bash
docker-compose restart backend
```

### Step 4: Verify in Lumina
1. Refresh Lumina workflow board
2. Find the order you changed
3. **Expected:** Order should now be in "Completed" column

### Step 5: Check backend logs
```bash
docker-compose logs --tail=50 backend | grep "Updated order.*workflow"
```

You should see:
```
Updated order X workflow stage from WooCommerce: completed
```

## Test 4: New Custom Status Detection

### Step 1: Add new order with custom status in WooCommerce
1. Create a new order in WooCommerce
2. Set status to one of your custom statuses (e.g., "Design" or "Draft")
3. Save the order

### Step 2: Trigger sync
```bash
docker-compose restart backend
```

Wait 15 seconds, then:
```bash
docker-compose logs --tail=100 backend | grep "workflow stage"
```

### Step 3: Verify in Lumina
1. Refresh Lumina workflow board
2. **Expected:** New order appears in correct custom status column

## Test 5: Bulk Update

### Step 1: Select multiple orders in Lumina
1. Open workflow board
2. Use Shift+Click or Ctrl+Click to select multiple orders in "Processing"

### Step 2: Bulk move to "Design"
1. Click "Move to..." button (if available in UI)
2. Or use bulk update API endpoint:

```bash
# Get your auth token first (from browser DevTools → Application → Cookies)
# Replace TOKEN and order IDs
curl -X POST http://localhost:3001/api/v1/workflow/bulk-update \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_ids": [1, 2, 3],
    "stage_id": 3
  }'
```

### Step 3: Verify in WooCommerce
1. Check each order in WooCommerce admin
2. **Expected:** All orders updated to "Design" status

## Monitoring & Debugging

### Check Workflow Stages
```bash
docker-compose exec -T backend node -e "
const knex = require('./dist/database/knex').default;
knex('order_workflow_stages')
  .select('*')
  .orderBy('position')
  .then(console.log)
  .then(() => process.exit(0));
"
```

### Check Orders in Workflow
```bash
docker-compose exec -T backend node -e "
const knex = require('./dist/database/knex').default;
knex('order_workflow as ow')
  .join('order_workflow_stages as s', 'ow.stage_id', 's.id')
  .select('ow.order_id', 's.name as stage', 's.wc_status')
  .orderBy('s.position')
  .limit(10)
  .then(console.log)
  .then(() => process.exit(0));
"
```

### Check Sync Logs
```bash
# Watch logs in real-time
docker-compose logs -f backend | grep -E "Sync|workflow|WooCommerce"
```

### Force Immediate Sync
```bash
# Restart backend to trigger sync on startup
docker-compose restart backend

# Watch logs
docker-compose logs -f backend
```

## Troubleshooting

### Workflow Board Shows "Failed to load"
**Check:** SQL query error in logs
**Fix:** Already fixed in `workflow.service.ts:82`
**Verify:** `docker-compose logs backend | grep "workflow board error"`

### Orders Not Syncing from WooCommerce
**Check:** WooCommerce API credentials
**Fix:** Settings → WooCommerce → Verify credentials
**Verify:** `docker-compose logs backend | grep "WooCommerce API"`

### Custom Statuses Not Appearing
**Check:** `status=any` parameter in API call
**Fix:** Already implemented in `woocommerce.service.ts:158`
**Verify:** `docker-compose logs backend | grep "Detected WooCommerce statuses"`

### Drag & Drop Not Updating WooCommerce
**Check:** Backend route uses `updateOrderStageWithWooCommerceSync`
**Fix:** Already implemented in `workflow.routes.ts:91`
**Verify:** `docker-compose logs backend | grep "Syncing order.*to WooCommerce"`

### Order Stuck in Wrong Stage
**Solution:** Manually trigger sync
```bash
docker-compose restart backend
```
Or wait for next automatic sync (30 minutes)

## Success Criteria

✅ Workflow board loads with all 88 orders
✅ Custom statuses (Design, Checkout Draft) appear
✅ Dragging order in Lumina updates WooCommerce
✅ Changing status in WooCommerce updates Lumina (after sync)
✅ No "No workflow stages configured" errors
✅ No SQL ambiguity errors
✅ Sync logs show successful status detection

## Performance Metrics

- Sync interval: 30 minutes
- Orders per sync: 88 (up to 100 configurable)
- Average sync time: ~5 seconds
- API calls per order update: 2 (Lumina DB + WooCommerce API)

## Next Steps (Optional)

1. Add manual sync button in UI
2. Add status mapping configuration UI
3. Show last sync time in UI
4. Add real-time WebSocket updates (instead of 30-min polling)
5. Add conflict resolution for simultaneous changes
