# Google Calendar OAuth Setup Guide

This guide will help you set up Google Calendar integration for Lumina.

## Prerequisites

- Google Cloud Platform account
- Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, navigate to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on it and press **Enable**

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type (or "Internal" if using Google Workspace)
   - Fill in required fields:
     - App name: "Lumina Dashboard"
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/calendar.events.readonly`
   - Save and continue

4. Back in Credentials, create OAuth client ID:
   - Application type: **Web application**
   - Name: "Lumina Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `http://localhost:3001`
     - Add your production domain if applicable
   - Authorized redirect URIs:
     - `http://localhost:3000/calendar-callback.html`
     - Add your production callback URL if applicable
   - Click **Create**

5. **Copy** your **Client ID** and **Client Secret**

## Step 4: Configure Lumina

1. Open `backend/.env` file (create if it doesn't exist)
2. Add your Google Calendar credentials:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/calendar-callback.html
```

3. Restart the backend container:

```bash
docker-compose restart backend
```

## Step 5: Test the Integration

1. Open Lumina at `http://localhost:3000`
2. Login with your credentials
3. Look at the right sidebar
4. Click on **Google Calendar** card
5. Click **Connect Google Calendar**
6. Authorize in the popup window
7. Your calendar events should start syncing!

## OAuth Consent Screen for Production

For production deployment:

1. In Google Cloud Console, go to **OAuth consent screen**
2. Add your production domain to authorized domains
3. Update authorized redirect URIs with your production URL
4. Submit app for verification if needed (for >100 users)

## Troubleshooting

### "Error 400: redirect_uri_mismatch"

- Ensure the redirect URI in `.env` exactly matches the authorized redirect URI in Google Cloud Console
- Check for trailing slashes - they must match exactly

### "Access blocked: This app's request is invalid"

- Make sure you've added the correct scopes in OAuth consent screen
- Verify that Google Calendar API is enabled

### Events not syncing

- Check backend logs: `docker-compose logs backend`
- Verify your credentials are correct in `.env`
- Try manually triggering a sync from the Google Calendar card

### "Authorization cancelled"

- The popup was closed before completing authorization
- Click "Connect Google Calendar" again to retry

## API Endpoints

The following endpoints are available for Google Calendar integration:

- `GET /api/v1/calendar-sync/google/auth-url` - Get OAuth authorization URL
- `POST /api/v1/calendar-sync/google/callback` - Complete OAuth flow
- `POST /api/v1/calendar-sync/google/sync` - Manually trigger sync
- `GET /api/v1/calendar-sync/google/status` - Get sync status
- `DELETE /api/v1/calendar-sync/google/disconnect` - Disconnect calendar

## Sync Behavior

- **Automatic sync**: Runs every 30 minutes (configurable via `SYNC_INTERVAL`)
- **Date range**: Syncs events from 30 days ago to 90 days in the future
- **Read-only**: Lumina only reads your calendar, never modifies it
- **Event storage**: Events are cached in the local database for offline access

## Security Notes

- Never commit `.env` file to version control
- Use environment variables for sensitive credentials
- Rotate credentials if compromised
- Use read-only scopes to minimize risk
- Consider using Google Cloud Secret Manager for production

## Support

For issues or questions:
- Check backend logs: `docker-compose logs backend`
- Check frontend console in browser DevTools
- Verify Google Cloud Console configuration
- Ensure network connectivity to Google APIs
