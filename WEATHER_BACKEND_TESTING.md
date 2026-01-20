# Weather Widget Backend - Testing Guide

## Overview
The Weather Widget backend has been successfully implemented with OpenWeatherMap integration. This guide provides step-by-step testing instructions.

## Implementation Summary

### Files Created

1. **Database Migration**: `backend/src/database/migrations/004_weather_cache.ts`
   - Creates `weather_cache` table for 30-minute API response caching
   - Reduces API calls to stay within free tier (1,000 calls/day)
   - ✅ Migration executed successfully (Batch 4)

2. **Weather Service**: `backend/src/services/weather.service.ts`
   - OpenWeatherMap API integration
   - Cache management (30-minute expiry)
   - Celsius/Fahrenheit support
   - Graceful error handling with cached data fallback
   - ✅ Compiled and deployed

3. **Weather Routes**: `backend/src/routes/weather.routes.ts`
   - 5 API endpoints (see below)
   - JWT authentication required
   - Admin-only routes for configuration
   - ✅ Registered in server.ts

4. **Settings Update**: `backend/src/services/settings.service.ts`
   - Added `units` field to weather settings schema
   - Default: `metric` (Celsius)
   - ✅ Updated

### Database Schema

```sql
CREATE TABLE weather_cache (
  id INTEGER PRIMARY KEY,
  family_id INTEGER NOT NULL,
  location_code VARCHAR(255) NOT NULL,  -- "CityName-current" or "CityName-forecast"
  weather_data JSON NOT NULL,           -- Cached API response
  cached_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,        -- Cache expires after 30 minutes
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(family_id, location_code),
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE
);
```

### Weather Settings Schema

Stored in `family_settings` table under `features` type:

```json
{
  "weather": {
    "enabled": false,
    "apiKey": "",
    "location": "",
    "units": "metric"  // "metric" = Celsius, "imperial" = Fahrenheit
  }
}
```

## API Endpoints

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### 1. GET /api/v1/weather/current
**Description**: Get current weather for family
**Auth**: Required (any family member)
**Returns**: Current weather with temperature, conditions, humidity, wind, etc.

**Response Example**:
```json
{
  "weather": {
    "temperature": 22,
    "feelsLike": 20,
    "condition": "Clouds",
    "description": "scattered clouds",
    "icon": "03d",
    "humidity": 65,
    "windSpeed": 5,
    "pressure": 1013,
    "visibility": 10000,
    "sunrise": 1737357600,
    "sunset": 1737391200,
    "location": "San Francisco",
    "country": "US",
    "updatedAt": "2026-01-20T09:30:00.000Z"
  },
  "cached": false
}
```

**Error Responses**:
- `400`: Weather feature not enabled
- `404`: Weather data not available
- `500`: API failure (returns cached data if available)

### 2. GET /api/v1/weather/forecast
**Description**: Get 3-day weather forecast
**Auth**: Required (any family member)
**Returns**: 3-day forecast with daily highs/lows

**Response Example**:
```json
{
  "forecast": {
    "location": "San Francisco",
    "country": "US",
    "days": [
      {
        "date": "2026-01-20",
        "tempMax": 24,
        "tempMin": 18,
        "condition": "Clear",
        "description": "clear sky",
        "icon": "01d",
        "humidity": 60,
        "windSpeed": 6,
        "precipitation": 0
      },
      {
        "date": "2026-01-21",
        "tempMax": 22,
        "tempMin": 16,
        "condition": "Rain",
        "description": "light rain",
        "icon": "10d",
        "humidity": 75,
        "windSpeed": 8,
        "precipitation": 2.5
      },
      {
        "date": "2026-01-22",
        "tempMax": 20,
        "tempMin": 15,
        "condition": "Clouds",
        "description": "overcast clouds",
        "icon": "04d",
        "humidity": 70,
        "windSpeed": 7,
        "precipitation": 0
      }
    ],
    "updatedAt": "2026-01-20T09:30:00.000Z"
  },
  "cached": false
}
```

### 3. POST /api/v1/weather/test
**Description**: Test API key with OpenWeatherMap
**Auth**: Required (admin only)
**Body**:
```json
{
  "apiKey": "your_openweathermap_api_key",
  "location": "San Francisco"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Successfully connected to OpenWeatherMap API",
  "data": {
    "location": "San Francisco",
    "country": "US",
    "temperature": 22,
    "condition": "Clear"
  }
}
```

**Error Responses**:
- `400` (Invalid API Key):
  ```json
  {
    "success": false,
    "message": "Invalid API key. Please check your OpenWeatherMap API key."
  }
  ```
- `400` (Location Not Found):
  ```json
  {
    "success": false,
    "message": "Location not found. Please enter a valid city name."
  }
  ```

### 4. GET /api/v1/weather/status
**Description**: Get weather feature status
**Auth**: Required (any family member)

**Response Example**:
```json
{
  "enabled": true,
  "configured": true,
  "location": "San Francisco",
  "units": "metric"
}
```

### 5. POST /api/v1/weather/clear-cache
**Description**: Manually clear expired cache entries
**Auth**: Required (admin only)

**Response**:
```json
{
  "message": "Cache cleared successfully",
  "entriesRemoved": 5
}
```

## Testing Instructions

### Prerequisites

1. **Get OpenWeatherMap API Key** (Free Tier):
   - Go to https://openweathermap.org/api
   - Sign up for free account
   - Generate API key
   - Free tier: 1,000 calls/day, 60 calls/minute

2. **Get JWT Token**:
   ```bash
   # Login as admin user
   curl -X POST http://localhost:3001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'

   # Save the token from response
   export TOKEN="your_jwt_token_here"
   ```

### Test 1: Test API Connection

```bash
curl -X POST http://localhost:3001/api/v1/weather/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "your_openweathermap_api_key",
    "location": "San Francisco"
  }'
```

**Expected**: Should return success with current weather data for San Francisco.

### Test 2: Enable Weather via Settings API

```bash
# Get current settings
curl -X GET http://localhost:3001/api/v1/settings/features \
  -H "Authorization: Bearer $TOKEN"

# Update settings to enable weather
curl -X PUT http://localhost:3001/api/v1/settings/features \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "chores": {
        "enabled": false
      },
      "weather": {
        "enabled": true,
        "apiKey": "your_openweathermap_api_key",
        "location": "San Francisco",
        "units": "metric"
      },
      "photos": {
        "enabled": false
      }
    }
  }'
```

**Expected**: Should return updated settings with weather enabled.

### Test 3: Get Current Weather

```bash
curl -X GET http://localhost:3001/api/v1/weather/current \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Should return current weather for San Francisco with temperature in Celsius.

**First Call**: Fetches from OpenWeatherMap API and caches result
**Second Call** (within 30 min): Returns cached data (no API call)

### Test 4: Get Weather Forecast

```bash
curl -X GET http://localhost:3001/api/v1/weather/forecast \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Should return 3-day forecast with daily highs/lows.

### Test 5: Check Weather Status

```bash
curl -X GET http://localhost:3001/api/v1/weather/status \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**:
```json
{
  "enabled": true,
  "configured": true,
  "location": "San Francisco",
  "units": "metric"
}
```

### Test 6: Test Cache Behavior

```bash
# First call - fetches from API
time curl -X GET http://localhost:3001/api/v1/weather/current \
  -H "Authorization: Bearer $TOKEN"

# Second call - returns from cache (should be faster)
time curl -X GET http://localhost:3001/api/v1/weather/current \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Second call should be significantly faster (< 100ms vs ~500ms).

### Test 7: Test Units Toggle (Celsius vs Fahrenheit)

```bash
# Change to Fahrenheit
curl -X PUT http://localhost:3001/api/v1/settings/features \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "weather": {
        "enabled": true,
        "apiKey": "your_openweathermap_api_key",
        "location": "San Francisco",
        "units": "imperial"
      }
    }
  }'

# Get current weather (should now be in Fahrenheit)
curl -X GET http://localhost:3001/api/v1/weather/current \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Temperature should now be in Fahrenheit (e.g., 72° instead of 22°).

### Test 8: Test Error Handling (Disabled Feature)

```bash
# Disable weather
curl -X PUT http://localhost:3001/api/v1/settings/features \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "weather": {
        "enabled": false
      }
    }
  }'

# Try to get weather
curl -X GET http://localhost:3001/api/v1/weather/current \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Should return `400` error with message "Weather feature is not enabled".

### Test 9: Verify Database Entries

```bash
# Check weather_cache table
docker-compose exec backend node -e "
const knex = require('knex');
const db = knex({
  client: 'sqlite3',
  connection: { filename: '/app/data/lumina.db' },
  useNullAsDefault: true
});
db('weather_cache').select('*').then(rows => {
  console.log('Cache entries:', rows.length);
  rows.forEach(r => {
    console.log(\`  - Family \${r.family_id}, Location: \${r.location_code}, Expires: \${r.expires_at}\`);
  });
  process.exit(0);
});
"
```

**Expected**: Should show cached weather entries with expiry times.

## Key Features Implemented

✅ **OpenWeatherMap Integration**
- Free tier API (1,000 calls/day)
- Current weather endpoint
- 3-day forecast endpoint

✅ **Intelligent Caching**
- 30-minute cache duration
- Automatic expiry
- Fallback to expired cache on API failures

✅ **Family Settings Integration**
- Checks `family_settings.features.weather.enabled`
- Respects admin-only configuration
- Real-time toggle support

✅ **Unit Conversion**
- Metric (Celsius, km/h, mm)
- Imperial (Fahrenheit, mph, inches)
- Configurable per family

✅ **Error Handling**
- Invalid API key detection
- Location not found handling
- API timeout handling
- Graceful degradation with cached data

✅ **Security**
- JWT authentication on all endpoints
- Admin-only configuration endpoints
- API key stored in database
- Input validation

## Next Steps (Frontend Implementation)

After backend is tested and verified:

1. **Frontend Weather Widget Component** (Task 3.2.4)
   - Display current weather in header
   - Show 3-day forecast on hover/click
   - Skylight-styled UI with weather icons
   - Auto-refresh every 30 minutes

2. **Settings Panel Integration** (Task 3.2.5)
   - Weather toggle in Features tab
   - API key input field
   - Location input field
   - Celsius/Fahrenheit toggle
   - Test connection button

3. **Weather Icons** (Task 3.2.6)
   - Use OpenWeatherMap icon codes
   - Custom SVG icons matching Skylight design
   - Animation for current conditions

## Troubleshooting

### Issue: "Weather feature is not enabled"
**Solution**: Enable weather in family settings via `/api/v1/settings/features` endpoint.

### Issue: "Invalid API key"
**Solution**: Verify OpenWeatherMap API key is correct and active. May take a few minutes after generation.

### Issue: "Location not found"
**Solution**: Use standard city names (e.g., "New York" not "NYC"). Try adding country code: "London,GB".

### Issue: Cache not working
**Solution**: Check `weather_cache` table exists and `expires_at` timestamps are correct.

### Issue: API rate limit exceeded
**Solution**: Free tier allows 1,000 calls/day. Cache reduces calls significantly. Check cache duration is set to 30 minutes.

## API Rate Limit Management

With 30-minute caching:
- **Max API calls per day**: ~48 (24 hours / 30 min cache × 2 endpoints)
- **Well under free tier limit**: 1,000 calls/day
- **Multiple families supported**: Even 20 families = 960 calls/day

## Deployment Status

✅ **Migration**: Batch 4 executed successfully
✅ **Backend**: Compiled and running (54.8s build time)
✅ **Routes**: Registered at `/api/v1/weather/*`
✅ **Health Check**: Passing
✅ **Ready for Testing**: All endpoints operational

---

**Backend implementation complete!** Ready for frontend integration in Tasks 3.2.4-3.2.6. 🎉
