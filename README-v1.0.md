# Lumina v1.0 - Family Dashboard

**Your family's digital command center** - A beautiful, modern dashboard for managing your family's calendar, photos, weather, and more. Built with React, TypeScript, and designed for both desktop and mobile devices.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa)](https://web.dev/progressive-web-apps/)

![Lumina Dashboard](screenshots/dashboard.png)

## Features

### 🗓️ Unified Calendar
- **Multi-source integration**: Combine events from iCloud, Google Calendar, and internal calendar
- **Visual organization**: Color-coded events with custom categories
- **Easy management**: Create, edit, and delete events with a beautiful interface
- **Order tracking**: Automatic Shopify order integration shown as calendar events

### 📸 Photo Gallery
- **Local uploads**: Secure photo storage with automatic optimization
- **Smart organization**: Album management and filtering
- **Optimized delivery**: Three-tier storage (originals, medium 1200px, thumbnails 300px)
- **Fast loading**: Lazy loading and masonry grid layout
- **Future-ready**: Architecture designed for Google Photos and Immich integration

### ☁️ Weather Widget
- **Real-time data**: Powered by OpenWeatherMap API
- **Always visible**: Displays in header with current conditions
- **Smart caching**: 30-minute cache to reduce API calls
- **Customizable**: Support for Celsius/Fahrenheit

### 🖥️ Kiosk Mode
- **Wall-mounted display**: Perfect for tablets and digital frames
- **Auto-slideshow**: Rotates through photos, calendar, weather, and dashboard
- **Fullscreen mode**: Automatic fullscreen with wake-lock support
- **Touch-optimized**: Large touch targets and simple navigation
- **Idle detection**: Starts slideshow after 2 minutes of inactivity

### 📱 Mobile & PWA
- **Progressive Web App**: Install to home screen on iOS and Android
- **Offline support**: Service worker caching for offline access
- **Mobile navigation**: iOS-style bottom navigation bar
- **Touch gestures**: Swipe navigation, pull-to-refresh, pinch-to-zoom (coming soon)
- **Responsive design**: Optimized layouts for all screen sizes
- **Safe areas**: Proper support for notched phones (iPhone X+)

### ⚙️ Settings & Administration
- **Family management**: Multi-user support with admin controls
- **Feature toggles**: Enable/disable features as needed
- **API integrations**: Configure iCloud, Google, Shopify, and Weather APIs
- **User customization**: Personal colors and preferences

## Screenshots

| Desktop Dashboard | Mobile View | Kiosk Mode |
|-------------------|-------------|------------|
| ![Desktop](screenshots/desktop.png) | ![Mobile](screenshots/mobile.png) | ![Kiosk](screenshots/kiosk.png) |

| Photo Gallery | Calendar | Settings |
|---------------|----------|----------|
| ![Photos](screenshots/photos.png) | ![Calendar](screenshots/calendar.png) | ![Settings](screenshots/settings.png) |

## Technology Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Zustand** - Lightweight state management
- **FullCalendar** - Feature-rich calendar component
- **React Router** - Client-side routing
- **Lucide Icons** - Beautiful icon set

### Backend
- **Node.js 18** - JavaScript runtime
- **Express.js** - Web framework
- **TypeScript** - Type-safe server code
- **SQLite** - Lightweight database
- **Knex.js** - SQL query builder
- **Sharp** - Image processing
- **JWT** - Authentication
- **Bull** - Job queue for background tasks

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Web server (production)
- **Redis** - Caching and job queue

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- iCloud, Google, or Shopify account (optional, for integrations)
- OpenWeatherMap API key (optional, for weather)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/lumina.git
cd lumina
```

2. **Create environment files**

Backend `.env`:
```env
# Server
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this

# Database
DATABASE_PATH=./data/lumina.db

# Weather API (optional)
OPENWEATHER_API_KEY=your-openweather-api-key

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

Frontend `.env`:
```env
REACT_APP_API_URL=http://localhost:3001
```

3. **Start with Docker Compose**
```bash
docker-compose up -d
```

4. **Access Lumina**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

5. **Create your first user**
- Navigate to http://localhost:3000
- Click "Register" and create an admin account
- Configure settings and start using Lumina!

### Development Setup

For local development without Docker:

1. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

2. **Start Redis** (required for backend)
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

3. **Run database migrations**
```bash
cd backend
npm run migrate
```

4. **Start development servers**
```bash
# Backend (from backend/)
npm run dev

# Frontend (from frontend/)
npm start
```

## Configuration

### API Integrations

#### iCloud Calendar
1. Generate app-specific password at https://appleid.apple.com
2. In Settings → Integrations → iCloud:
   - Email: your-icloud-email@icloud.com
   - Password: app-specific-password
   - Test connection

#### Google Calendar
1. Create OAuth 2.0 credentials in Google Cloud Console
2. In Settings → Integrations → Google:
   - Client ID: your-client-id
   - Client Secret: your-client-secret
   - Authorize access
   - Select calendars to sync

#### Weather
1. Sign up at https://openweathermap.org/api
2. Get free API key
3. In Settings → Integrations → Weather:
   - API Key: your-api-key
   - Location: City, Country Code (e.g., "Seattle, US")
   - Units: Metric or Imperial
   - Test connection

#### Shopify Orders
1. Create private app in Shopify admin
2. Get Admin API access token
3. In Settings → Integrations → Shopify:
   - Shop Name: your-shop.myshopify.com
   - Access Token: shppa_xxxxx
   - Test connection

### Feature Configuration

In Settings → Features, you can enable/disable:
- **Photo Gallery**: Local photo uploads and management
- **Weather Widget**: Display current weather in header
- **iCloud Sync**: Import events from iCloud Calendar
- **Google Sync**: Import events from Google Calendar
- **Shopify Integration**: Show orders as calendar events
- **Kiosk Mode**: Enable fullscreen kiosk display

## Mobile & PWA Installation

### iOS (iPhone/iPad)
1. Open Safari and navigate to your Lumina URL
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right
5. Lumina icon will appear on your home screen
6. Launch from home screen for full-screen experience

### Android
1. Open Chrome and navigate to your Lumina URL
2. Tap the menu (three dots) in top right
3. Tap "Add to Home Screen" or "Install App"
4. Confirm installation
5. Lumina icon will appear in app drawer
6. Launch for native app-like experience

### Features When Installed
- ✅ Offline access to cached data
- ✅ Splash screen on launch
- ✅ No browser UI (standalone mode)
- ✅ Native notifications (future)
- ✅ Faster load times

## Usage Guide

### Calendar

**Creating Events**:
1. Click/tap on any date or time slot
2. Fill in event details (title, description, location)
3. Set as all-day or specific time
4. Click "Create Event"

**Editing Events**:
1. Click/tap on existing event
2. Modify details
3. Click "Update Event" or "Delete"

**Viewing Different Calendars**:
- Month view: See entire month at a glance
- Week view: Detailed weekly schedule
- Day view: Hour-by-hour breakdown

**Filtering**:
- Events are color-coded by source (iCloud, Google, Shopify)
- Shopify orders appear with shopping cart icon
- Click source name to show/hide specific calendars

### Photo Gallery

**Uploading Photos**:
1. Click "Upload Photos" button
2. Select one or more images
3. Optionally add to an album
4. Wait for upload and optimization
5. Photos appear in gallery

**Managing Albums**:
1. Click "Manage Albums"
2. Create new albums
3. Rename or delete existing albums
4. Organize photos into albums

**Viewing Photos**:
- Click any photo to view full-size
- Edit title and description
- Rotate photos
- Delete photos
- Move to different album

### Kiosk Mode

**Entering Kiosk Mode**:
- **Mobile**: Tap Home in bottom nav → "Kiosk Mode"
- **Desktop**: Navigate to `/kiosk` URL
- **URL**: Add `?kiosk=true` to any page

**Slideshow**:
- Automatically starts after 2 minutes of inactivity
- Rotates through: Photos, Calendar Events, Weather, Dashboard
- Default: 15 seconds per slide
- Smooth fade transitions

**Exiting Kiosk Mode**:
- **From slideshow**: Tap anywhere
- **From kiosk view**: Triple-tap top-left corner (100x100px area)
- Returns to normal dashboard

**Settings**:
- Configure slideshow sources (photos, calendar, weather)
- Adjust idle timeout (1-10 minutes)
- Adjust slide duration (10-60 seconds)
- Enable/disable auto-fullscreen
- Set PIN protection (future)

## Architecture

### Project Structure
```
lumina/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── database/        # Migrations and seeds
│   │   ├── jobs/            # Background job processors
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── server.ts        # Express app entry
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── manifest.json    # PWA manifest
│   │   ├── service-worker.js # Service worker
│   │   └── icons/           # PWA icons
│   ├── src/
│   │   ├── api/             # API client
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── stores/          # Zustand stores
│   │   └── App.tsx          # App entry
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── TESTING.md              # Test plan
├── PERFORMANCE.md          # Performance docs
└── README-v1.0.md         # This file
```

### Database Schema

**Tables**:
- `families` - Family/household data
- `users` - Family members and authentication
- `family_settings` - Feature toggles and API configs
- `calendar_events` - Internal calendar events
- `albums` - Photo album organization
- `photos` - Photo metadata
- `photo_metadata` - Extended photo data

**Indexes**:
- All foreign keys indexed
- `family_id` indexed on all tables
- `created_at` indexed for sorting

### API Endpoints

**Authentication**:
- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

**Calendar**:
- `GET /api/v1/events/unified` - Get all events (merged)
- `POST /api/v1/events` - Create event
- `PUT /api/v1/events/:id` - Update event
- `DELETE /api/v1/events/:id` - Delete event

**Photos**:
- `GET /api/v1/photos` - List photos
- `POST /api/v1/photos/upload` - Upload photos
- `GET /api/v1/photos/serve/:familyId/:type/:filename` - Serve image
- `POST /api/v1/photos/:id/rotate` - Rotate photo
- `DELETE /api/v1/photos/:id` - Delete photo

**Albums**:
- `GET /api/v1/photos/albums` - List albums
- `POST /api/v1/photos/albums` - Create album
- `PUT /api/v1/photos/albums/:id` - Update album
- `DELETE /api/v1/photos/albums/:id` - Delete album

**Settings**:
- `GET /api/v1/settings` - Get family settings
- `PUT /api/v1/settings/features` - Update features
- `PUT /api/v1/settings/integrations/:provider` - Update integration

**Weather**:
- `GET /api/v1/weather/current` - Get current weather
- `POST /api/v1/weather/test` - Test API connection

### Background Jobs

Uses Bull queue with Redis:
- **iCloud sync**: Every 15 minutes
- **Google sync**: Every 15 minutes
- **Shopify sync**: Every 30 minutes
- **Weather cache**: Every 30 minutes

## Performance

### Optimizations Implemented
- ✅ Code splitting with React.lazy
- ✅ Image optimization (3-tier storage)
- ✅ Service worker caching
- ✅ Lazy loading images
- ✅ Pull-to-refresh
- ✅ Pagination for large datasets
- ✅ Database indexing
- ✅ API response caching

### Lighthouse Scores (Target)
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95
- SEO: > 90
- PWA: 100

See [PERFORMANCE.md](./PERFORMANCE.md) for detailed optimization guide.

## Testing

Comprehensive test plan available in [TESTING.md](./TESTING.md).

**Test Coverage**:
- PWA installation (iOS/Android)
- Offline functionality
- Mobile navigation
- Touch gestures
- Responsive layouts
- Kiosk mode
- Performance benchmarks
- Browser compatibility
- Accessibility

## Deployment

### Docker Compose (Recommended)

```bash
# Production
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual Deployment

1. **Build Frontend**:
```bash
cd frontend
npm run build
# Serve build/ with nginx or similar
```

2. **Build Backend**:
```bash
cd backend
npm run build
# Run: node dist/server.js
```

3. **Setup Database**:
```bash
npm run migrate
```

4. **Configure Environment**:
- Set production environment variables
- Use strong JWT secrets
- Configure HTTPS
- Set up reverse proxy (nginx)

### Environment Variables

**Backend** (`.env`):
```env
NODE_ENV=production
PORT=3001
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
DATABASE_PATH=./data/lumina.db
OPENWEATHER_API_KEY=<your-key>
REDIS_HOST=redis
REDIS_PORT=6379
```

**Frontend** (`.env.production`):
```env
REACT_APP_API_URL=https://your-domain.com
```

## Troubleshooting

### Common Issues

**Weather not loading**:
- Check API key is valid
- Verify location format: "City, CountryCode"
- Test connection in Settings
- Check backend logs for API errors

**Photos not uploading**:
- Check file size (< 10MB default)
- Verify file type is image/*
- Check backend logs for Sharp errors
- Ensure data directory is writable

**Calendar events not syncing**:
- Verify API credentials in Settings
- Check "Last Synced" timestamp
- Test connection for each integration
- Check backend logs for sync job errors

**PWA not installing**:
- Ensure HTTPS (required for PWA)
- Verify manifest.json is accessible
- Check service-worker.js registers
- Clear browser cache and retry

**Mobile layout broken**:
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Clear service worker cache
- Check browser console for errors

### Debug Mode

Enable debug logging:
```bash
# Backend
DEBUG=lumina:* npm run dev

# Frontend
REACT_APP_DEBUG=true npm start
```

### Logs

View logs:
```bash
# Docker
docker-compose logs -f backend
docker-compose logs -f frontend

# PM2 (if using)
pm2 logs lumina-backend
```

## Roadmap

### v1.1 (Next Release)
- [ ] Google Photos integration
- [ ] Immich integration
- [ ] Push notifications
- [ ] Meal planning module
- [ ] Shopping list feature
- [ ] Customizable themes
- [ ] Multi-language support

### Future
- [ ] Mobile apps (React Native)
- [ ] Voice commands (Alexa/Google)
- [ ] Smart home integration
- [ ] Family chat/messaging
- [ ] Chore tracking
- [ ] Budget/expense tracking

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests (if applicable)
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Skylight Calendar for design inspiration
- OpenWeatherMap for weather data
- FullCalendar for calendar component
- All open-source contributors

## Support

- **Issues**: https://github.com/yourusername/lumina/issues
- **Discussions**: https://github.com/yourusername/lumina/discussions
- **Email**: support@lumina.family

---

**Made with ❤️ for families everywhere**

*Lumina v1.0 - Your Family's Digital Command Center*
