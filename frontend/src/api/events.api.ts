import apiClient from './axios.config';

/**
 * Events API
 * Handles unified events (calendar + orders) and calendar event CRUD
 */

export interface UnifiedEvent {
  id: string; // "calendar-{id}" or "order-{id}"
  type: 'calendar' | 'order';
  title: string;
  description: string | null;
  start: string;
  end: string;
  allDay: boolean;
  source: string;
  status?: string;
  metadata: {
    familyId: number;
    userId?: number;
    customerName?: string;
    total?: number;
    location?: string;
    color?: string;
    originalId: number;
    rawData?: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: number;
  family_id: number;
  user_id: number | null;
  source: string;
  external_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location: string | null;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  location?: string;
  userId?: number;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  location?: string;
}

export interface EventsParams {
  start?: string;
  end?: string;
  source?: string;
  type?: 'calendar' | 'order';
  userId?: number;
}

export interface EventStats {
  totalCalendarEvents: number;
  totalOrders: number;
  totalEvents: number;
  upcomingEvents: number;
}

export const eventsAPI = {
  /**
   * Get unified events (calendar + orders)
   */
  async getUnifiedEvents(params?: EventsParams): Promise<{ events: UnifiedEvent[]; count: number }> {
    const response = await apiClient.get<{ events: UnifiedEvent[]; count: number }>('/events', {
      params,
    });
    return response.data;
  },

  /**
   * Get event statistics
   */
  async getStats(): Promise<{ stats: EventStats }> {
    const response = await apiClient.get<{ stats: EventStats }>('/events/stats');
    return response.data;
  },

  /**
   * Create calendar event
   */
  async createEvent(
    data: CreateEventRequest
  ): Promise<{ message: string; event: CalendarEvent }> {
    const response = await apiClient.post<{ message: string; event: CalendarEvent }>(
      '/events/calendar',
      data
    );
    return response.data;
  },

  /**
   * Get calendar event by ID
   */
  async getEvent(id: number): Promise<{ event: CalendarEvent }> {
    const response = await apiClient.get<{ event: CalendarEvent }>(`/events/calendar/${id}`);
    return response.data;
  },

  /**
   * Update calendar event
   */
  async updateEvent(
    id: number,
    updates: UpdateEventRequest
  ): Promise<{ message: string; event: CalendarEvent }> {
    const response = await apiClient.put<{ message: string; event: CalendarEvent }>(
      `/events/calendar/${id}`,
      updates
    );
    return response.data;
  },

  /**
   * Delete calendar event
   */
  async deleteEvent(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/events/calendar/${id}`);
    return response.data;
  },
};

export default eventsAPI;
