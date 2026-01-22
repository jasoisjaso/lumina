# Workflow Board Filter Fixes

## Overview

This document details the fixes applied to resolve customization field extraction and date filtering issues in the Lumina Workflow Board.

## Issues Fixed

### 1. Customization Field Extraction Enhancement

**Problem**: Orders weren't showing up when filtering by board style, font, or color because the field extraction logic used exact string matching and had a limited set of field name variations.

**Solution**: Enhanced the customization extractor with:

- **Fuzzy field matching**: Normalizes field names by removing spaces, hyphens, and underscores for more flexible matching
- **Expanded field mappings**: Added 40+ field name variations to catch different naming patterns
- **Partial matching**: Checks if field names contain or are contained by the search pattern

**Files Modified**:
- `backend/src/utils/customization-extractor.ts`

**Changes**:
```typescript
// Before: Exact case-insensitive match only
if (metaItem.key.toLowerCase().trim() === key.toLowerCase().trim())

// After: Normalized fuzzy matching
const normalize = (str: string) => str.toLowerCase().replace(/[_\-\s]/g, '');
if (normalizedMetaKey === normalizedKey || 
    normalizedMetaKey.includes(normalizedKey))
```

**Enhanced Field Patterns**:
- `board_style`: Now matches `board-style`, `Board Style`, `boardstyle`, `board_style`, `board type`, `_board_style`, etc.
- `font`: Now matches `Font`, `font`, `font-style`, `fonttype`, `font_choice`, `Font Type`, `_font`, etc.
- `board_color`: Now matches `board-color`, `board_color`, `boardcolor`, `Color`, `colour`, `_color`, etc.
- Added support for `theme`, `size`, `name_colors`, etc.

### 2. Date Filter Logic Enhancement

**Problem**: Clicking "7 days" or "30 days" showed empty results because the date comparison didn't account for time-of-day differences.

**Solution**: Enhanced the date filtering logic to:

- Set `date_from` to **start of day** (00:00:00) instead of current time
- Set `date_to` to **end of day** (23:59:59) instead of current time
- Convert dates to ISO strings for consistent database comparison

**Files Modified**:
- `backend/src/services/workflow.service.ts`

**Changes**:
```typescript
// Before: Simple string comparison
if (filters.date_from) {
  queryBuilder.where('co.date_created', '>=', filters.date_from);
}

// After: Proper timezone handling
if (filters.date_from) {
  const dateFrom = new Date(filters.date_from);
  dateFrom.setHours(0, 0, 0, 0); // Start of day
  queryBuilder.where('co.date_created', '>=', dateFrom.toISOString());
}
```

### 3. Debug Logging

**Added comprehensive debug logging** to help troubleshoot future issues:

- **Field Extraction**: Logs all available meta field keys when `DEBUG_CUSTOMIZATION=true`
- **Filter Application**: Logs which filters are being applied and how many results are returned
- **Order Processing**: Shows extracted customization data during sync

**Files Modified**:
- `backend/src/utils/customization-extractor.ts` - Added `debug` parameter
- `backend/src/services/woocommerce.service.ts` - Respects `DEBUG_CUSTOMIZATION` env var
- `backend/src/services/workflow.service.ts` - Logs filter operations

## Testing & Validation

### Running Tests

1. **Backfill existing orders** with new extraction logic:
```bash
cd backend
npm run backfill:customizations
```

2. **Debug sync** (syncs last 7 days with detailed logging):
```bash
cd backend
npm run debug:sync
```

3. **Manual sync** with debugging:
```bash
cd backend
DEBUG_CUSTOMIZATION=true npm start
# Trigger a sync from the UI or wait for scheduled sync
```

### Validation Checklist

- [ ] Backfill script successfully extracts customization from existing orders
- [ ] Filter dropdowns show actual board styles, fonts, and colors from your orders
- [ ] Filtering by board style returns correct orders
- [ ] Filtering by font returns correct orders
- [ ] Filtering by board color returns correct orders
- [ ] "7 days" date filter shows orders from last week
- [ ] "30 days" date filter shows orders from last month
- [ ] Combining filters (e.g., board style + date range) works correctly
- [ ] Clearing filters shows all orders again

## Database Schema

The system uses the following database structure for customization data:

```sql
-- cached_orders table
CREATE TABLE cached_orders (
  ...
  customization_details TEXT, -- JSON string with extracted data
  ...
);

-- Indexes for fast filtering (SQLite 3.38+)
CREATE INDEX idx_customization_board_style 
  ON cached_orders(json_extract(customization_details, '$.board_style'))
  WHERE customization_details IS NOT NULL;

CREATE INDEX idx_customization_font 
  ON cached_orders(json_extract(customization_details, '$.font'))
  WHERE customization_details IS NOT NULL;

CREATE INDEX idx_customization_color 
  ON cached_orders(json_extract(customization_details, '$.board_color'))
  WHERE customization_details IS NOT NULL;
```

## Customization Data Format

```json
{
  "board_style": "Large Board",
  "font": "Ballerina",
  "board_color": "Strawberry Milkshake",
  "number_of_names": 2,
  "names": ["Eve", "Grace"],
  "names_text": "Eve, Grace",
  "theme": "Unicorn Theme",
  "size": "30cm x 40cm",
  "raw_meta": [...] // Full meta_data for debugging
}
```

## Performance Considerations

- **JSON Indexes**: If your SQLite version is 3.38+, the system creates indexes on JSON fields for fast filtering
- **Field Extraction**: Happens once during order sync, not on every filter operation
- **Caching**: Orders are cached locally, so filtering is instantaneous
- **Pagination**: Frontend loads all workflow stages and orders in one request for seamless drag-and-drop

## Troubleshooting

### Filters still showing empty results

1. Check if customization data was extracted:
```bash
cd backend
npm run debug:sync
```

2. Look for log output showing extracted fields for each order

3. If no fields are extracted, check the meta_data structure in raw_data:
- The debug script shows all available meta field keys
- Compare them with FIELD_MAPPINGS in `customization-extractor.ts`
- Add missing field name variations to the mappings

### Date filter not working

1. Check server logs for filter debug output
2. Verify `date_created` field exists in cached_orders table
3. Ensure dates are being passed correctly from frontend

### Performance issues

1. Verify SQLite version supports JSON indexes:
```bash
sqlite3 --version
```

2. If version is below 3.38, consider upgrading SQLite

3. Check query performance:
```sql
EXPLAIN QUERY PLAN 
SELECT * FROM cached_orders 
WHERE json_extract(customization_details, '$.board_style') = 'Large Board';
```

## Maintenance

### Adding New Customization Fields

1. Add field to `CustomizationDetails` interface in `customization-extractor.ts`
2. Add field name patterns to `FIELD_MAPPINGS`
3. Add extraction logic in `extractCustomizationDetails()`
4. Create database index for the new field (optional, for performance)
5. Run backfill script to update existing orders

### Example: Adding "Material" field

```typescript
// 1. Add to interface
export interface CustomizationDetails {
  ...
  material?: string;
}

// 2. Add to mappings
const FIELD_MAPPINGS = {
  ...
  material: ['Material', 'material', 'Board Material', 'material_type'],
};

// 3. Add extraction logic
const material = findMetaValue(metaData, FIELD_MAPPINGS.material);
if (material) {
  details.material = String(material);
  if (debug) console.log('✓ Extracted material:', material);
}

// 4. Update hasCustomization check
const hasCustomization = 
  details.board_style || ... || details.material;
```

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `npm run backfill:customizations` | Re-extract customization data from all existing orders |
| `npm run debug:sync` | Sync last 7 days with detailed debug logging |
| `DEBUG_CUSTOMIZATION=true` | Enable debug logging for field extraction |

## Architecture Notes

- **Separation of Concerns**: Field extraction logic is isolated in `customization-extractor.ts`
- **Backward Compatibility**: Old orders without customization_details still work
- **Graceful Degradation**: If extraction fails, order is still synced (just without filters)
- **Debug-Friendly**: Raw meta_data is preserved in customization_details for troubleshooting

## Future Enhancements

1. **AI-Powered Field Detection**: Use LLM to suggest field mappings based on actual order data
2. **Field Mapping UI**: Admin interface to configure field mappings without code changes
3. **Customization Analytics**: Dashboard showing most popular board styles, fonts, colors
4. **Smart Filters**: Auto-suggest filters based on common customization combinations
5. **Bulk Operations**: Apply actions to all orders matching a filter
