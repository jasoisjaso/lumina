import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import knex from '../database/knex';
import { config } from '../config';
import { settingsService } from './settings.service';

/**
 * Google Calendar Service
 * Handles OAuth 2.0 authentication and calendar event syncing
 * Now integrated with family settings - checks if Google Calendar is enabled before syncing
 */

interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface CalendarTokens {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

interface SyncResult {
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  errors: string[];
}

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: calendar_v3.Calendar;

  constructor(private googleConfig: GoogleCalendarConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(userId: number): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events.readonly',
    ];

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen to get refresh token
      state: Buffer.from(JSON.stringify({ userId })).toString('base64'),
    });

    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<CalendarTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new Error('No access token received');
      }

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || '',
        scope: tokens.scope || '',
        token_type: tokens.token_type || 'Bearer',
        expiry_date: tokens.expiry_date || Date.now() + 3600000,
      };
    } catch (error: any) {
      console.error('Token exchange error:', error);
      throw new Error(`Failed to exchange code for tokens: ${error.message}`);
    }
  }

  /**
   * Store tokens for a user
   */
  async storeUserTokens(
    userId: number,
    familyId: number,
    tokens: CalendarTokens
  ): Promise<void> {
    const existingSync = await knex('calendar_sync_tokens')
      .where({ user_id: userId, provider: 'google' })
      .first();

    if (existingSync) {
      await knex('calendar_sync_tokens')
        .where({ user_id: userId, provider: 'google' })
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: new Date(tokens.expiry_date),
          scope: tokens.scope,
          updated_at: knex.fn.now(),
        });
    } else {
      await knex('calendar_sync_tokens').insert({
        family_id: familyId,
        user_id: userId,
        provider: 'google',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(tokens.expiry_date),
        scope: tokens.scope,
      });
    }
  }

  /**
   * Get stored tokens for a user
   */
  async getUserTokens(userId: number): Promise<CalendarTokens | null> {
    const syncToken = await knex('calendar_sync_tokens')
      .where({ user_id: userId, provider: 'google' })
      .first();

    if (!syncToken) {
      return null;
    }

    return {
      access_token: syncToken.access_token,
      refresh_token: syncToken.refresh_token,
      scope: syncToken.scope || '',
      token_type: 'Bearer',
      expiry_date: new Date(syncToken.token_expiry).getTime(),
    };
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(userId: number): Promise<void> {
    const tokens = await this.getUserTokens(userId);

    if (!tokens || !tokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const expiryBuffer = 5 * 60 * 1000;
    if (tokens.expiry_date > Date.now() + expiryBuffer) {
      // Token is still valid
      return;
    }

    try {
      this.oauth2Client.setCredentials({
        refresh_token: tokens.refresh_token,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();

      if (credentials.access_token) {
        await knex('calendar_sync_tokens')
          .where({ user_id: userId, provider: 'google' })
          .update({
            access_token: credentials.access_token,
            token_expiry: new Date(credentials.expiry_date || Date.now() + 3600000),
            updated_at: knex.fn.now(),
          });
      }
    } catch (error: any) {
      console.error('Token refresh error:', error);
      throw new Error(`Failed to refresh access token: ${error.message}`);
    }
  }

  /**
   * Set credentials for the OAuth client
   */
  private setCredentials(tokens: CalendarTokens): void {
    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
    });
  }

  /**
   * Fetch events from Google Calendar
   */
  async fetchCalendarEvents(
    userId: number,
    timeMin?: Date,
    timeMax?: Date
  ): Promise<calendar_v3.Schema$Event[]> {
    // Refresh token if needed
    await this.refreshAccessToken(userId);

    const tokens = await this.getUserTokens(userId);
    if (!tokens) {
      throw new Error('No tokens found for user');
    }

    this.setCredentials(tokens);

    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin?.toISOString() || new Date().toISOString(),
        timeMax: timeMax?.toISOString(),
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error: any) {
      console.error('Fetch events error:', error);
      throw new Error(`Failed to fetch calendar events: ${error.message}`);
    }
  }

  /**
   * Sync Google Calendar events to database
   * Checks family settings to ensure Google Calendar is enabled
   */
  async syncEventsForUser(userId: number, familyId: number): Promise<SyncResult> {
    const result: SyncResult = {
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      errors: [],
    };

    try {
      // Check if Google Calendar is enabled in family settings
      const isEnabled = await this.isEnabledForFamily(familyId);
      if (!isEnabled) {
        result.errors.push('Google Calendar is not enabled for this family');
        return result;
      }

      // Fetch events from last 30 days to next 90 days
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);

      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 90);

      const events = await this.fetchCalendarEvents(userId, timeMin, timeMax);

      for (const event of events) {
        try {
          result.eventsProcessed++;
          await this.syncEventToDatabase(event, userId, familyId);

          // Check if event already exists
          const existing = await knex('calendar_events')
            .where({ external_id: event.id, source: 'google' })
            .first();

          if (existing) {
            result.eventsUpdated++;
          } else {
            result.eventsCreated++;
          }
        } catch (error: any) {
          result.errors.push(`Event ${event.id}: ${error.message}`);
        }
      }

      // Update last sync time
      await knex('calendar_sync_tokens')
        .where({ user_id: userId, provider: 'google' })
        .update({ last_synced: knex.fn.now() });

    } catch (error: any) {
      console.error('Sync error:', error);
      result.errors.push(`Sync failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Sync individual event to database
   */
  private async syncEventToDatabase(
    event: calendar_v3.Schema$Event,
    userId: number,
    familyId: number
  ): Promise<void> {
    if (!event.id || !event.summary) {
      return; // Skip events without id or title
    }

    const startTime = event.start?.dateTime || event.start?.date;
    const endTime = event.end?.dateTime || event.end?.date;

    if (!startTime || !endTime) {
      return; // Skip events without time
    }

    const eventData = {
      family_id: familyId,
      user_id: userId,
      source: 'google',
      external_id: event.id,
      title: event.summary,
      description: event.description || null,
      start_time: new Date(startTime),
      end_time: new Date(endTime),
      all_day: !event.start?.dateTime, // If no dateTime, it's an all-day event
      location: event.location || null,
      raw_data: JSON.stringify(event),
      updated_at: knex.fn.now(),
    };

    const existing = await knex('calendar_events')
      .where({ external_id: event.id, source: 'google' })
      .first();

    if (existing) {
      await knex('calendar_events')
        .where({ id: existing.id })
        .update(eventData);
    } else {
      await knex('calendar_events').insert({
        ...eventData,
        created_at: knex.fn.now(),
      });
    }
  }

  /**
   * Disconnect Google Calendar for a user
   */
  async disconnectCalendar(userId: number): Promise<void> {
    await knex('calendar_sync_tokens')
      .where({ user_id: userId, provider: 'google' })
      .delete();

    // Optionally delete synced events
    // await knex('calendar_events')
    //   .where({ user_id: userId, source: 'google' })
    //   .delete();
  }

  /**
   * Check if user has connected Google Calendar
   */
  async isConnected(userId: number): Promise<boolean> {
    const syncToken = await knex('calendar_sync_tokens')
      .where({ user_id: userId, provider: 'google' })
      .first();

    return !!syncToken;
  }

  /**
   * Check if Google Calendar is enabled in family settings
   */
  async isEnabledForFamily(familyId: number): Promise<boolean> {
    try {
      const integrationSettings = await settingsService.getSettings(familyId, 'integrations');
      return integrationSettings?.googleCalendar?.enabled === true;
    } catch (error) {
      console.error('Error checking Google Calendar enabled status:', error);
      return false;
    }
  }

  /**
   * Get sync status for user
   */
  async getSyncStatus(userId: number): Promise<{
    connected: boolean;
    lastSynced: Date | null;
    eventCount: number;
  }> {
    const syncToken = await knex('calendar_sync_tokens')
      .where({ user_id: userId, provider: 'google' })
      .first();

    const eventCount = await knex('calendar_events')
      .where({ user_id: userId, source: 'google' })
      .count('* as count')
      .first();

    return {
      connected: !!syncToken,
      lastSynced: syncToken?.last_synced || null,
      eventCount: Number(eventCount?.count || 0),
    };
  }
}

// Export singleton instance
const googleConfig: GoogleCalendarConfig = {
  clientId: config.google.clientId,
  clientSecret: config.google.clientSecret,
  redirectUri: config.google.redirectUri,
};

export const googleCalendarService = new GoogleCalendarService(googleConfig);
