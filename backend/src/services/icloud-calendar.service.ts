import knex from '../database/knex';
import settingsService from './settings.service';
import axios, { AxiosInstance } from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';

/**
 * iCloud Calendar Service
 * CalDAV integration for syncing iCloud calendar events
 */

const parseXml = promisify(parseString);

interface ICloudConfig {
  appleId: string;
  appPassword: string;
  calendarUrl?: string;
}

interface CalDAVEvent {
  uid: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  etag?: string;
}

interface CalendarEvent {
  id?: number;
  family_id: number;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  location?: string;
  source: 'icloud';
  external_id: string;
  created_at?: Date;
  updated_at?: Date;
}

class ICloudCalendarService {
  private readonly ICLOUD_CALDAV_BASE = 'https://caldav.icloud.com';

  /**
   * Check if iCloud Calendar is enabled for a family
   */
  async isEnabledForFamily(familyId: number): Promise<boolean> {
    const integrationSettings = await settingsService.getSettings(familyId, 'integrations');
    return integrationSettings?.icloudCalendar?.enabled === true;
  }

  /**
   * Get iCloud configuration for a family
   */
  async getICloudConfig(familyId: number): Promise<ICloudConfig | null> {
    const integrationSettings = await settingsService.getSettings(familyId, 'integrations');
    const icloudSettings = integrationSettings?.icloudCalendar;

    if (!icloudSettings?.enabled || !icloudSettings?.appleId || !icloudSettings?.appPassword) {
      return null;
    }

    return {
      appleId: icloudSettings.appleId,
      appPassword: icloudSettings.appPassword,
      calendarUrl: icloudSettings.calendarUrl,
    };
  }

  /**
   * Create CalDAV HTTP client
   */
  private createCalDAVClient(appleId: string, appPassword: string): AxiosInstance {
    return axios.create({
      baseURL: this.ICLOUD_CALDAV_BASE,
      auth: {
        username: appleId,
        password: appPassword,
      },
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        Depth: '1',
      },
      timeout: 30000,
    });
  }

  /**
   * Test iCloud CalDAV connection
   */
  async testConnection(
    appleId: string,
    appPassword: string
  ): Promise<{ success: boolean; message: string; calendarUrl?: string }> {
    try {
      const client = this.createCalDAVClient(appleId, appPassword);

      // Try to get principal URL (user's calendar home)
      const principalPath = `/${appleId}/principal/`;

      const response = await client.request({
        method: 'PROPFIND',
        url: principalPath,
        data: `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:">
            <D:prop>
              <D:current-user-principal/>
            </D:prop>
          </D:propfind>`,
      });

      if (response.status === 207) {
        // Multi-Status response means success
        // Try to find calendar home
        const calendarHomePath = `/${appleId}/calendars/`;

        return {
          success: true,
          message: 'Successfully connected to iCloud Calendar',
          calendarUrl: calendarHomePath,
        };
      }

      return {
        success: false,
        message: 'Failed to connect to iCloud Calendar',
      };
    } catch (error: any) {
      console.error('iCloud connection test failed:', error);

      if (error.response?.status === 401) {
        return {
          success: false,
          message: 'Invalid Apple ID or App-Specific Password. Please check your credentials.',
        };
      }

      return {
        success: false,
        message: error.message || 'Connection test failed',
      };
    }
  }

  /**
   * Discover calendars for the user
   */
  async discoverCalendars(
    appleId: string,
    appPassword: string
  ): Promise<{ name: string; url: string }[]> {
    try {
      const client = this.createCalDAVClient(appleId, appPassword);
      const calendarHomePath = `/${appleId}/calendars/`;

      const response = await client.request({
        method: 'PROPFIND',
        url: calendarHomePath,
        data: `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
            <D:prop>
              <D:displayname/>
              <D:resourcetype/>
              <C:calendar-description/>
            </D:prop>
          </D:propfind>`,
      });

      const parsed: any = await parseXml(response.data);
      const calendars: { name: string; url: string }[] = [];

      // Parse the multistatus response
      if (parsed?.multistatus?.response) {
        const responses = Array.isArray(parsed.multistatus.response)
          ? parsed.multistatus.response
          : [parsed.multistatus.response];

        for (const res of responses) {
          const href = res.href?.[0];
          const displayName = res.propstat?.[0]?.prop?.[0]?.displayname?.[0];

          if (href && displayName && href.includes('/calendars/')) {
            calendars.push({
              name: displayName,
              url: href,
            });
          }
        }
      }

      return calendars;
    } catch (error: any) {
      console.error('Failed to discover calendars:', error);
      return [];
    }
  }

  /**
   * Fetch events from iCloud calendar
   */
  async fetchEvents(familyId: number): Promise<CalDAVEvent[]> {
    const config = await this.getICloudConfig(familyId);
    if (!config) {
      throw new Error('iCloud Calendar not configured');
    }

    const client = this.createCalDAVClient(config.appleId, config.appPassword);

    // Use the configured calendar URL or default to home calendar
    const calendarPath = config.calendarUrl || `/${config.appleId}/calendars/`;

    try {
      // Get events from the last 30 days and next 90 days
      const now = new Date();
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const startStr = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endStr = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const response = await client.request({
        method: 'REPORT',
        url: calendarPath,
        data: `<?xml version="1.0" encoding="utf-8" ?>
          <C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:D="DAV:">
            <D:prop>
              <D:getetag/>
              <C:calendar-data/>
            </D:prop>
            <C:filter>
              <C:comp-filter name="VCALENDAR">
                <C:comp-filter name="VEVENT">
                  <C:time-range start="${startStr}" end="${endStr}"/>
                </C:comp-filter>
              </C:comp-filter>
            </C:filter>
          </C:calendar-query>`,
      });

      const events: CalDAVEvent[] = [];
      const parsed: any = await parseXml(response.data);

      if (parsed?.multistatus?.response) {
        const responses = Array.isArray(parsed.multistatus.response)
          ? parsed.multistatus.response
          : [parsed.multistatus.response];

        for (const res of responses) {
          const calendarData = res.propstat?.[0]?.prop?.[0]?.['calendar-data']?.[0];
          const etag = res.propstat?.[0]?.prop?.[0]?.getetag?.[0];

          if (calendarData) {
            const event = this.parseICalEvent(calendarData, etag);
            if (event) {
              events.push(event);
            }
          }
        }
      }

      return events;
    } catch (error: any) {
      console.error('Failed to fetch iCloud events:', error);
      throw new Error('Failed to fetch events from iCloud Calendar');
    }
  }

  /**
   * Parse iCalendar (ICS) format to CalDAVEvent
   */
  private parseICalEvent(icsData: string, etag?: string): CalDAVEvent | null {
    try {
      // Simple ICS parser (basic implementation)
      const lines = icsData.split('\n').map((l) => l.trim());

      let uid = '';
      let summary = '';
      let description = '';
      let location = '';
      let dtstart = '';
      let dtend = '';

      for (const line of lines) {
        if (line.startsWith('UID:')) {
          uid = line.substring(4);
        } else if (line.startsWith('SUMMARY:')) {
          summary = line.substring(8);
        } else if (line.startsWith('DESCRIPTION:')) {
          description = line.substring(12);
        } else if (line.startsWith('LOCATION:')) {
          location = line.substring(9);
        } else if (line.startsWith('DTSTART')) {
          // Can be DTSTART;VALUE=DATE:20260120 or DTSTART:20260120T093000Z
          const match = line.match(/DTSTART[^:]*:(.+)/);
          if (match) {
            dtstart = match[1];
          }
        } else if (line.startsWith('DTEND')) {
          const match = line.match(/DTEND[^:]*:(.+)/);
          if (match) {
            dtend = match[1];
          }
        }
      }

      if (!uid || !summary || !dtstart) {
        return null;
      }

      return {
        uid,
        summary,
        description: description || undefined,
        location: location || undefined,
        start: this.parseICalDate(dtstart),
        end: dtend ? this.parseICalDate(dtend) : this.parseICalDate(dtstart),
        etag,
      };
    } catch (error) {
      console.error('Failed to parse iCal event:', error);
      return null;
    }
  }

  /**
   * Parse iCalendar date format
   */
  private parseICalDate(dateStr: string): Date {
    // Handle both date-time (20260120T093000Z) and date-only (20260120) formats
    if (dateStr.includes('T')) {
      // Date-time format: 20260120T093000Z
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      const hour = parseInt(dateStr.substring(9, 11));
      const minute = parseInt(dateStr.substring(11, 13));
      const second = parseInt(dateStr.substring(13, 15));

      return new Date(Date.UTC(year, month, day, hour, minute, second));
    } else {
      // Date-only format: 20260120
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));

      return new Date(year, month, day);
    }
  }

  /**
   * Sync iCloud calendar events to database
   */
  async syncCalendar(familyId: number): Promise<{ synced: number; errors: number }> {
    try {
      const events = await this.fetchEvents(familyId);

      let synced = 0;
      let errors = 0;

      for (const event of events) {
        try {
          // Check if event already exists
          const existing = await knex('calendar_events')
            .where({
              family_id: familyId,
              source: 'icloud',
              external_id: event.uid,
            })
            .first();

          const eventData: Partial<CalendarEvent> = {
            family_id: familyId,
            title: event.summary,
            description: event.description || undefined,
            start_time: event.start,
            end_time: event.end,
            location: event.location || undefined,
            source: 'icloud',
            external_id: event.uid,
            updated_at: new Date(),
          };

          if (existing) {
            // Update existing event
            await knex('calendar_events').where({ id: existing.id }).update(eventData);
          } else {
            // Insert new event
            await knex('calendar_events').insert({
              ...eventData,
              created_at: new Date(),
            });
          }

          synced++;
        } catch (error) {
          console.error(`Failed to sync event ${event.uid}:`, error);
          errors++;
        }
      }

      console.log(`iCloud sync completed: ${synced} synced, ${errors} errors`);

      return { synced, errors };
    } catch (error: any) {
      console.error('iCloud calendar sync failed:', error);
      throw error;
    }
  }

  /**
   * Delete all iCloud events for a family (when disconnecting)
   */
  async deleteAllEvents(familyId: number): Promise<void> {
    await knex('calendar_events')
      .where({
        family_id: familyId,
        source: 'icloud',
      })
      .delete();
  }
}

// Export singleton instance
export const icloudCalendarService = new ICloudCalendarService();
export default icloudCalendarService;
