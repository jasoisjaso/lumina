import db from '../database/knex';

/**
 * Events Service
 * Handles unified events by merging calendar events with WooCommerce orders
 */

export interface UnifiedEvent {
  id: string; // Format: "calendar-{id}" or "order-{id}"
  type: 'calendar' | 'order';
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
  source: string; // 'google', 'icloud', 'manual', 'woocommerce'
  status?: string; // For orders: 'pending', 'processing', 'completed', etc.
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarEvent {
  id: number;
  family_id: number;
  user_id: number | null;
  source: string;
  external_id: string | null;
  title: string;
  description: string | null;
  start_time: Date;
  end_time: Date;
  all_day: boolean;
  location: string | null;
  raw_data: any;
  created_at: Date;
  updated_at: Date;
}

class EventsService {
  /**
   * Get unified events (calendar events + orders) for a family
   */
  async getUnifiedEvents(
    familyId: number,
    options: {
      start?: Date;
      end?: Date;
      source?: string;
      type?: 'calendar' | 'order';
      userId?: number;
    } = {}
  ): Promise<UnifiedEvent[]> {
    const { start, end, source, type, userId } = options;
    const events: UnifiedEvent[] = [];

    // Fetch calendar events if not filtering by type=order
    if (!type || type === 'calendar') {
      const calendarEvents = await this.getCalendarEvents(familyId, {
        start,
        end,
        source,
        userId,
      });
      events.push(...calendarEvents);
    }

    // Fetch order events if not filtering by type=calendar
    if (!type || type === 'order') {
      const orderEvents = await this.getOrderEvents(familyId, { start, end });
      events.push(...orderEvents);
    }

    // Sort by start date
    events.sort((a, b) => a.start.getTime() - b.start.getTime());

    return events;
  }

  /**
   * Get calendar events as UnifiedEvent format
   */
  private async getCalendarEvents(
    familyId: number,
    options: {
      start?: Date;
      end?: Date;
      source?: string;
      userId?: number;
    } = {}
  ): Promise<UnifiedEvent[]> {
    const { start, end, source, userId } = options;

    let query = db('calendar_events').where({ family_id: familyId });

    if (start) {
      query = query.where('start_time', '>=', start);
    }

    if (end) {
      query = query.where('start_time', '<=', end);
    }

    if (source) {
      query = query.where({ source });
    }

    if (userId) {
      query = query.where({ user_id: userId });
    }

    const events = await query.orderBy('start_time', 'asc');

    return events.map((event: CalendarEvent) => this.transformCalendarEvent(event));
  }

  /**
   * Get orders as UnifiedEvent format
   */
  private async getOrderEvents(
    familyId: number,
    options: {
      start?: Date;
      end?: Date;
    } = {}
  ): Promise<UnifiedEvent[]> {
    const { start, end } = options;

    let query = db('cached_orders').where({ family_id: familyId });

    if (start) {
      query = query.where('date_created', '>=', start);
    }

    if (end) {
      query = query.where('date_created', '<=', end);
    }

    const orders = await query.orderBy('date_created', 'asc');

    return orders.map((order: any) => this.transformOrderEvent(order));
  }

  /**
   * Transform calendar event to UnifiedEvent
   */
  private transformCalendarEvent(event: CalendarEvent): UnifiedEvent {
    return {
      id: `calendar-${event.id}`,
      type: 'calendar',
      title: event.title,
      description: event.description,
      start: new Date(event.start_time),
      end: new Date(event.end_time),
      allDay: event.all_day,
      source: event.source,
      metadata: {
        familyId: event.family_id,
        userId: event.user_id || undefined,
        location: event.location || undefined,
        originalId: event.id,
        rawData: typeof event.raw_data === 'string' ? JSON.parse(event.raw_data) : event.raw_data,
      },
      createdAt: new Date(event.created_at),
      updatedAt: new Date(event.updated_at),
    };
  }

  /**
   * Transform order to UnifiedEvent
   */
  private transformOrderEvent(order: any): UnifiedEvent {
    const rawData = typeof order.raw_data === 'string' ? JSON.parse(order.raw_data) : order.raw_data;

    return {
      id: `order-${order.id}`,
      type: 'order',
      title: `Order #${order.woocommerce_order_id} - ${order.customer_name}`,
      description: `Order total: $${order.total}`,
      start: new Date(order.date_created),
      end: new Date(order.date_created),
      allDay: false,
      source: 'woocommerce',
      status: order.status,
      metadata: {
        familyId: order.family_id,
        customerName: order.customer_name,
        total: parseFloat(order.total),
        originalId: order.id,
        rawData: rawData,
      },
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at),
    };
  }

  /**
   * Create a new calendar event
   */
  async createCalendarEvent(data: {
    familyId: number;
    userId?: number;
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    allDay?: boolean;
    location?: string;
    source?: string;
  }): Promise<CalendarEvent> {
    const [eventId] = await db('calendar_events').insert({
      family_id: data.familyId,
      user_id: data.userId || null,
      source: data.source || 'manual',
      external_id: null,
      title: data.title,
      description: data.description || null,
      start_time: data.startTime,
      end_time: data.endTime,
      all_day: data.allDay || false,
      location: data.location || null,
      raw_data: null,
    });

    const event = await db('calendar_events').where({ id: eventId }).first();
    return event;
  }

  /**
   * Get a single calendar event
   */
  async getCalendarEvent(familyId: number, eventId: number): Promise<CalendarEvent | null> {
    const event = await db('calendar_events')
      .where({ id: eventId, family_id: familyId })
      .first();

    return event || null;
  }

  /**
   * Update a calendar event
   */
  async updateCalendarEvent(
    familyId: number,
    eventId: number,
    updates: {
      title?: string;
      description?: string;
      startTime?: Date;
      endTime?: Date;
      allDay?: boolean;
      location?: string;
    }
  ): Promise<CalendarEvent> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
    if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
    if (updates.allDay !== undefined) updateData.all_day = updates.allDay;
    if (updates.location !== undefined) updateData.location = updates.location;

    await db('calendar_events')
      .where({ id: eventId, family_id: familyId })
      .update(updateData);

    const event = await db('calendar_events')
      .where({ id: eventId, family_id: familyId })
      .first();

    if (!event) {
      throw new Error('Event not found');
    }

    return event;
  }

  /**
   * Delete a calendar event
   */
  async deleteCalendarEvent(familyId: number, eventId: number): Promise<void> {
    const deleted = await db('calendar_events')
      .where({ id: eventId, family_id: familyId })
      .delete();

    if (deleted === 0) {
      throw new Error('Event not found');
    }
  }

  /**
   * Get event statistics for a family
   */
  async getEventStats(familyId: number): Promise<any> {
    const calendarCount = await db('calendar_events')
      .where({ family_id: familyId })
      .count('id as count')
      .first();

    const orderCount = await db('cached_orders')
      .where({ family_id: familyId })
      .count('id as count')
      .first();

    const upcomingEvents = await db('calendar_events')
      .where({ family_id: familyId })
      .where('start_time', '>=', new Date())
      .count('id as count')
      .first();

    return {
      totalCalendarEvents: Number(calendarCount?.count || 0),
      totalOrders: Number(orderCount?.count || 0),
      totalEvents: Number(calendarCount?.count || 0) + Number(orderCount?.count || 0),
      upcomingEvents: Number(upcomingEvents?.count || 0),
    };
  }
}

export default new EventsService();
