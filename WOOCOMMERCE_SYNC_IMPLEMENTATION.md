# WooCommerce Bi-Directional Sync Implementation

## ✅ COMPLETED

### Overview
Implemented complete bi-directional sync between Lumina and WooCommerce Order Status Manager plugin. Orders can now be managed in Lumina's workflow board, and changes sync automatically to WooCommerce.

### Features Implemented

#### 1. **Custom Status Detection** ✅
- Automatically detects ALL WooCommerce order statuses including custom ones from Order Status Manager plugin
- Currently detected statuses:
  - `processing` (6 orders)
  - `design` (7 orders) - Custom status from Order Status Manager
  - `checkout-draft` (1 order) - Custom status from Order Status Manager
  - `completed` (69 orders)
  - `refunded` (4 orders)
  - `failed` (1 order)

#### 2. **Automatic Workflow Stage Creation** ✅
- Creates workflow stages automatically for each WooCommerce status
- Maps statuses to beautiful visual stages with colors:
  - Processing: Blue (#3B82F6)
  - Design: Purple (#8B5CF6)
  - Checkout Draft: Indigo (#6366F1)
  - Completed: Green (#10B981)
  - Refunded: Red (#EF4444)
  - Failed: Dark Red (#DC2626)

#### 3. **Bi-Directional Sync - Lumina → WooCommerce** ✅
When a user drags an order to a new stage in Lumina:
1. Order stage updates in Lumina database
2. API call to WooCommerce updates order status
3. Change history is recorded
4. If WooCommerce update fails, local change is preserved with error logged

**Implementation Location:**
- `backend/src/services/workflow.service.ts:368` - `updateOrderStageWithWooCommerceSync()`
- `backend/src/routes/workflow.routes.ts:91` - API endpoint handler

#### 4. **Bi-Directional Sync - WooCommerce → Lumina** ✅
During WooCommerce sync (every 30 minutes):
1. Fetches orders with `status=any` parameter to include custom statuses
2. Extracts unique statuses and creates/updates workflow stages
3. For each order, finds matching workflow stage by WooCommerce status
4. Updates order workflow entry or creates new one
5. Records stage change history if status changed

**Implementation Location:**
- `backend/src/services/woocommerce.service.ts:154` - Modified `syncOrdersForFamily()`
- `backend/src/services/workflow.service.ts:414` - `syncOrderStageFromWooCommerce()`

#### 5. **Workflow Board Fixed** ✅
- Fixed SQL ambiguity error in workflow board query
- All 88 orders now load successfully
- Orders grouped by stage on workflow board

**Implementation Location:**
- `backend/src/services/workflow.service.ts:82` - Fixed `getBoard()` query

## How It Works

### Initial Sync
1. WooCommerce sync job runs on startup and every 30 minutes
2. Fetches orders from WooCommerce API with `status=any`
3. Extracts all unique order statuses (including custom ones from plugins)
4. Calls `syncWorkflowStagesFromWooCommerce()` to create stages
5. For each order, calls `syncOrderStageFromWooCommerce()` to assign to correct stage

### User Interaction (Drag & Drop)
1. User drags order from one stage to another in Lumina UI
2. Frontend calls `PUT /api/v1/workflow/orders/:id` with `stage_id`
3. Backend calls `updateOrderStageWithWooCommerceSync()`
4. Method finds WooCommerce status for new stage
5. Updates local workflow database
6. Calls WooCommerce API to update order status
7. Records change in history table

### Background Sync
1. Every 30 minutes, sync job fetches updated orders
2. Compares WooCommerce status with Lumina workflow stage
3. If different, updates Lumina to match WooCommerce
4. Records change with "Synced from WooCommerce" note

## Files Modified

### Backend Services
- `backend/src/services/workflow.service.ts`
  - Added `syncWorkflowStagesFromWooCommerce()` - Create stages from WC statuses
  - Added `updateOrderStageWithWooCommerceSync()` - Lumina → WC sync
  - Added `syncOrderStageFromWooCommerce()` - WC → Lumina sync
  - Added `getStageByWcStatus()` - Helper method
  - Fixed `getBoard()` SQL query ambiguity

- `backend/src/services/woocommerce.service.ts`
  - Modified `syncOrdersForFamily()` - Added status=any, status detection
  - Modified `cacheOrder()` - Returns cachedOrderId for workflow sync
  - Already had `updateOrderStatus()` - Used for Lumina → WC sync

### Backend Routes
- `backend/src/routes/workflow.routes.ts`
  - Modified `PUT /orders/:id` - Uses bi-directional sync method
  - Modified `POST /bulk-update` - Supports WooCommerce sync for bulk operations

### Database
- No new migrations required - workflow tables already existed from migration 010

## Testing

### Verified
✅ Workflow board loads without errors
✅ All 88 orders appear in workflow
✅ Custom statuses (design, checkout-draft) detected
✅ Workflow stages created automatically
✅ Orders assigned to correct stages based on WooCommerce status

### To Test by User
1. **Drag order in Lumina** → Check if status updates in WooCommerce admin
2. **Change status in WooCommerce** → Wait for next sync (or trigger manually) → Check if Lumina updates
3. **Add new custom status in Order Status Manager** → Create order with that status → Check if new workflow stage appears

## API Endpoints

### Get Workflow Board
```
GET /api/v1/workflow/board
Returns: { stages: [...], orders: [...] }
```

### Update Order Stage
```
PUT /api/v1/workflow/orders/:id
Body: { stage_id: number }
Action: Updates Lumina + syncs to WooCommerce
```

### Bulk Update Orders
```
POST /api/v1/workflow/bulk-update
Body: { order_ids: number[], stage_id: number }
Action: Updates multiple orders + syncs each to WooCommerce
```

## Configuration

### WooCommerce API Settings
Located in Settings → WooCommerce:
- Store URL
- Consumer Key
- Consumer Secret

### Sync Interval
Currently: 30 minutes (configured in `backend/src/jobs/sync-orders.job.ts`)

## Error Handling

### WooCommerce API Failures
- Local Lumina updates are preserved even if WooCommerce update fails
- Errors logged to console: `Failed to sync order status to WooCommerce`
- Does not throw error - prevents blocking user workflow

### Missing Workflow Stages
- If no matching stage for WooCommerce status, uses first stage as fallback
- Prevents "No workflow stages configured" errors

## Logging

Key log messages to monitor:
- `Detected WooCommerce statuses:` - Shows all found statuses
- `Syncing workflow stages for family X` - Stage sync started
- `Creating new workflow stage: X (Y)` - New stage detected
- `Created N new workflow stages` - Stage sync completed
- `Syncing order X status to WooCommerce: Y` - Lumina → WC sync
- `Updated order X workflow stage from WooCommerce: Y` - WC → Lumina sync

## Performance

- Sync runs every 30 minutes
- Fetches up to 100 orders per request (configurable)
- Bulk operations process orders sequentially for WooCommerce sync
- Status detection runs once per sync, then caches stages

## Future Enhancements (Optional)

1. **Status Mapping UI** - Allow users to customize stage names/colors
2. **Manual Sync Button** - Trigger sync on demand
3. **Sync Status Indicator** - Show last sync time and status
4. **Webhook Support** - Real-time updates instead of polling
5. **Conflict Resolution** - Handle simultaneous changes in both systems

## Support

The Order Status Manager plugin works by:
1. Adding custom statuses to WooCommerce's status system
2. Making them available via REST API automatically
3. Using `status=any` parameter returns ALL statuses including custom ones

No additional API configuration needed - custom statuses just work!
