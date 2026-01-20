Lumina Project Guide for Claude v4.0
Project Vision & Philosophy

Lumina is a GUI-first, Skylight-inspired family command center that has evolved into a professional, user-configurable home dashboard. Every feature is toggleable and configurable through a beautiful web interface - no Docker/env edits required.
Core Development Principles

    GUI-First Configuration: Zero config file editing for users

    Skylight Aesthetic: Premium, clean UI with consistent design language

    Progressive Enhancement: Core features work simply, extras add delight

    Real-Time Responsiveness: UI updates instantly to settings changes

    Touch-First Design: Optimized for both kiosk and mobile use

🏗️ Current Implementation Status
✅ COMPLETED & DEPLOYED

Phase 1: Core Backend Infrastructure ✅

    Database Schema (SQLite + Knex)

    JWT Authentication with Refresh Tokens

    Family/User Management APIs

    33 Production-Ready API Endpoints

    WooCommerce Sync Service (background jobs)

    Unified Events System (merges multiple sources)

    Google Calendar GUI Integration

Phase 2: Frontend Foundation ✅

    React/TypeScript with Tailwind CSS

    Zustand State Management

    Axios Client with JWT Interceptors

    Protected Routing & Layout System

    FullCalendar Integration with Professional Styling

Phase 2.5: Skylight UI & Settings Revolution ✅

    Premium Skylight Design System

        Color Palette: Indigo (#4F46E5) / Emerald (#10B981) / Slate Scale

        Typography: Inter Font Family

        Component Library: Rounded cards, subtle shadows, smooth transitions

    Settings Architecture

        Family Settings Table with JSON storage

        Admin-Only Settings Panel (⚙️ Gear Icon)

        Real-Time Feature Toggling

    WooCommerce GUI Integration

        Toggle switch in Settings → Integrations

        API credential form with "Test Connection"

        Dynamic OrdersSidebar (appears/disappears instantly)

        Encrypted API key storage in database

Current Live State:

    Backend: Running on http://localhost:3001 (healthy)

    Frontend: Running on http://localhost:3000 (Skylight UI active)

    Test User: test@example.com / password123 (admin role)

    Settings Access: Gear icon (⚙️) visible to admin users only

🎯 IMMEDIATE NEXT TASK: WEATHER WIDGET WITH GUI CONFIGURATION
Mission Statement

Create a Skylight-styled weather widget that users can configure entirely through the GUI with OpenWeatherMap free tier.
Task Breakdown
Task 3.2.1: Backend Weather Service

File: backend/src/services/weather.service.ts (NEW)
Provider: OpenWeatherMap (free tier: 1,000 calls/day)
typescript

// Service Requirements:
1. Check family_settings.weather.enabled before any operation
2. Cache weather data for 30 minutes in weather_cache table
3. Support Celsius/Fahrenheit toggle via settings
4. Provide current weather + 3-day forecast
5. Handle API failures gracefully (use cached data)

Task 3.2.2: Database Schema Updates

Migration: 004_weather_cache.ts (NEW)
sql

-- weather_cache table
CREATE TABLE weather_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id INTEGER NOT NULL,
  location_code TEXT NOT NULL,  -- e.g., "90210" or "London,UK"
  weather_data JSON NOT NULL,   -- Full API response
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL, -- 30 minutes from cached_at
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

Settings Schema Addition:
json

{
  "weather": {
    "enabled": false,
    "provider": "openweathermap",
    "api_key": "encrypted_string",
    "location": "90210",
    "units": "celsius",
    "show_forecast": true
  }
}

Task 3.2.3: Weather API Routes

File: backend/src/routes/weather.routes.ts (NEW)

Required Endpoints:
text

GET  /api/v1/weather/current      → Get current weather for family
GET  /api/v1/weather/forecast     → Get 3-day forecast
POST /api/v1/weather/test         → Test API key with provided credentials

Task 3.2.4: Frontend Weather Widget

File: frontend/src/components/WeatherWidget.tsx (NEW)

Design Requirements:

    Skylight-styled (matching our indigo/emerald palette)

    Responsive: Collapses to compact view on mobile

    Shows: Current temp, condition icon, high/low, 3-day forecast

    Settings integration: Units toggle (C/F) changes display instantly

Widget Features:

    Current Conditions Card

        Large temperature display

        Weather condition icon

        "Feels like" temperature

        Location name

    3-Day Forecast

        Day names (Mon, Tue, Wed)

        High/Low temperatures

        Condition icons

        Precipitation chance

    Settings Integration

        Toggle widget on/off

        API key input with validation

        Location search/input

        Units toggle (Celsius/Fahrenheit)

Task 3.2.5: Settings Panel Updates

File: frontend/src/components/SettingsPanel.tsx (UPDATE)

Add to Integrations Tab:
typescript

// Weather Configuration Section
{
  label: "Weather",
  enabled: weatherSettings?.enabled || false,
  fields: [
    { type: "text", name: "api_key", label: "OpenWeatherMap API Key" },
    { type: "text", name: "location", label: "Location (ZIP or City)" },
    { type: "select", name: "units", label: "Units", options: ["celsius", "fahrenheit"] }
  ],
  testButton: "Test Connection"
}

Task 3.2.6: Layout Integration

File: frontend/src/components/Layout.tsx (UPDATE)

Add WeatherWidget to main layout:
tsx

// In the main dashboard area
<Calendar onError={handleError} />
{weatherEnabled && <WeatherWidget />}

📋 IMPLEMENTATION ROADMAP (UPDATED)
Phase 3: Feature Completion (GUI-Configured)

3.1: Google Calendar GUI Integration ✅ COMPLETE

    Backend: OAuth flow with token storage in family_settings

    Frontend: "Connect Google Account" button in Settings → Calendar tab

    Events appear in calendar with Google styling (#4285F4)

3.2: Weather Widget with GUI Configuration 🚨 NEXT UP

    OpenWeatherMap free tier integration

    GUI configuration for API key + units + location

    Skylight-styled display with caching

    Real-time unit switching

3.3: iCloud Calendar GUI Integration

    CalDAV implementation with GUI setup

    Basic auth in Settings panel

    Events styled with Apple purple (#5856D6)

3.4: Chores System (HomeGlow-inspired but configurable)

    Core Features:

        Create/assign chores to family members

        Set frequencies (daily, weekly, custom)

        Mark complete with swipe/click

    Gamification Toggle:

        When ON: Points system ("Clams"), streaks, leaderboard

        When OFF: Simple task checklist

    GUI Settings: Toggle system, configure gamification

3.5: Photo Gallery Backend & UI

    Photo upload/management

    Family album organization

    Skylight-style slideshow for kiosk mode

Phase 4: Dual Interface & Polish

4.1: Kiosk Mode Detection & UI

    URL-based detection (/kiosk path)

    Auto-fullscreen in kiosk mode

    Touch-optimized UI with larger targets

    Idle slideshow (photos + weather + calendar)

4.2: Mobile Responsive Refinement

    Optimize for phone/tablet use

    Touch gestures for mobile

    Progressive Web App capabilities

4.3: Raspberry Pi Optimization

    ARM-compatible Docker images

    Resource optimization for low-power devices

🏗️ Technical Architecture (Updated)
Finalized Tech Stack

Backend (API Server)

    Runtime: Node.js 18+

    Framework: Express with TypeScript

    Database: SQLite (via Knex.js query builder)

    Authentication: JWT (Access + Refresh token flow)

    Key NEW Packages:

        axios (for weather API)

        crypto-js (for encrypting stored API keys)

        node-cache (optional, for in-memory caching)

Frontend (Kiosk & Companion UI)

    Framework: React 18 with TypeScript

    Build: React Scripts

    Styling: Tailwind CSS + Skylight Design System

    State Management: Zustand

    Calendar: @fullcalendar/react + plugins

    HTTP Client: Axios with interceptors

    Weather Icons: react-icons or custom SVG set

Infrastructure

    Orchestration: Docker Compose

    Frontend Server: Nginx (Alpine)

    Image Base: -alpine variants (ARM-compatible)

Database Schema (Updated)
text

families               # Core family unit
users                  # User accounts with roles
family_settings        # GUI configuration (JSON storage)
cached_orders          # WooCommerce order cache  
calendar_events        # Events from all sources
weather_cache          # Cached weather data (NEW)
chores                 # Task management (PLANNED)
chore_assignments      # Chore-user relationships (PLANNED)
photos                 # Photo gallery (PLANNED)

Settings Architecture Pattern

Every new feature follows this pattern:

    Database Setting: family_settings.features.{feature_name}.enabled

    Service Check: Service verifies enabled flag before operation

    GUI Toggle: Admin can enable/disable in Settings panel

    Real-time UI: Components show/hide without refresh

🚀 Development Guide
Docker Commands (Primary Method)
bash

# Build and start all services
docker-compose up --build

# Start in background
docker-compose up -d --build

# View logs
docker-compose logs -f [backend|frontend|redis]

# Stop services
docker-compose down

# Access points:
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Health Check: http://localhost:3001/health

Testing New Features Checklist

    ✅ GUI toggle works (shows/hides feature)

    ✅ Settings persist across page refresh

    ✅ API keys/tokens stored encrypted

    ✅ UI matches Skylight design system

    ✅ Responsive on mobile/tablet

    ✅ Error handling for API failures

    ✅ Admin-only access for configuration

    ✅ Real-time UI updates without refresh

Weather Widget Design Specifications

Color Scheme:

    Primary: Indigo-600 (#4F46E5)

    Background: White / Slate-50 in dark mode

    Temperature: Slate-800 (#1E293B)

    Secondary: Emerald-500 (#10B981) for highlights

Layout:
text

[ Weather Widget ]
├── Current Conditions
│   ├── 🌤️ 72°F (Feels like 75°F)
│   ├── Sunny, Los Angeles
│   └── H: 78° L: 65°
└── 3-Day Forecast
    ├── Mon: ☀️ 78°/65°
    ├── Tue: ⛅ 76°/64°
    └── Wed: 🌧️ 70°/62°

Responsive Behavior:

    Desktop: Sidebar widget (300px width)

    Tablet: Below calendar, full width

    Mobile: Compact card, collapses forecast

📞 Quick Reference

Current Test Credentials:

    Email: test@example.com

    Password: password123

    Role: Admin (can access Settings ⚙️)

API Endpoints:

    Health: GET /health

    Auth: POST /api/v1/auth/login

    Settings: GET/PUT /api/v1/settings/:type

    Events: GET /api/v1/events

    Orders: GET /api/v1/orders

File Structure:
text

Lumina/
├── backend/
│   ├── src/
│   │   ├── services/          # Business logic
│   │   ├── routes/           # API endpoints
│   │   ├── database/         # Knex config & migrations
│   │   └── config/           # Configuration
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── stores/          # Zustand stores
│   │   ├── api/             # API client functions
│   │   └── App.tsx          # Main app entry
└── docker-compose.yml
