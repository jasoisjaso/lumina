import { Router, Response } from 'express';
import eventsService from '../services/events.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/events
 * Get unified events (calendar events + orders) for the authenticated user's family
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { start, end, source, type, userId } = req.query;

    const events = await eventsService.getUnifiedEvents(req.user.familyId, {
      start: start ? new Date(start as string) : undefined,
      end: end ? new Date(end as string) : undefined,
      source: source as string | undefined,
      type: type as 'calendar' | 'order' | undefined,
      userId: userId ? parseInt(userId as string) : undefined,
    });

    res.status(200).json({
      events,
      count: events.length,
    });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch events',
    });
  }
});

/**
 * GET /api/v1/events/stats
 * Get event statistics for the authenticated user's family
 */
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const stats = await eventsService.getEventStats(req.user.familyId);

    res.status(200).json({ stats });
  } catch (error: any) {
    console.error('Error fetching event stats:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch event statistics',
    });
  }
});

/**
 * POST /api/v1/events/calendar
 * Create a new calendar event
 */
router.post('/calendar', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const { title, description, startTime, endTime, allDay, location, userId } = req.body;

    // Validate required fields
    if (!title || !startTime || !endTime) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Missing required fields: title, startTime, endTime',
      });
      return;
    }

    // If userId is provided, verify it belongs to the same family
    if (userId && userId !== req.user.userId) {
      // TODO: Verify the userId belongs to the same family
      // For now, we'll allow it
    }

    const event = await eventsService.createCalendarEvent({
      familyId: req.user.familyId,
      userId: userId || req.user.userId,
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      allDay: allDay || false,
      location,
      source: 'manual',
    });

    res.status(201).json({
      message: 'Event created successfully',
      event,
    });
  } catch (error: any) {
    console.error('Error creating event:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to create event',
    });
  }
});

/**
 * GET /api/v1/events/calendar/:id
 * Get a specific calendar event
 */
router.get('/calendar/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid event ID' });
      return;
    }

    const event = await eventsService.getCalendarEvent(req.user.familyId, eventId);

    if (!event) {
      res.status(404).json({ error: 'Not Found', message: 'Event not found' });
      return;
    }

    res.status(200).json({ event });
  } catch (error: any) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'Failed to fetch event',
    });
  }
});

/**
 * PUT /api/v1/events/calendar/:id
 * Update a calendar event
 */
router.put('/calendar/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid event ID' });
      return;
    }

    const { title, description, startTime, endTime, allDay, location } = req.body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (startTime !== undefined) updates.startTime = new Date(startTime);
    if (endTime !== undefined) updates.endTime = new Date(endTime);
    if (allDay !== undefined) updates.allDay = allDay;
    if (location !== undefined) updates.location = location;

    const event = await eventsService.updateCalendarEvent(req.user.familyId, eventId, updates);

    res.status(200).json({
      message: 'Event updated successfully',
      event,
    });
  } catch (error: any) {
    console.error('Error updating event:', error);
    res.status(500).json({
      error: 'Update Failed',
      message: error.message || 'Failed to update event',
    });
  }
});

/**
 * DELETE /api/v1/events/calendar/:id
 * Delete a calendar event
 */
router.delete('/calendar/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const eventId = parseInt(req.params.id);
    if (isNaN(eventId)) {
      res.status(400).json({ error: 'Validation Error', message: 'Invalid event ID' });
      return;
    }

    await eventsService.deleteCalendarEvent(req.user.familyId, eventId);

    res.status(200).json({
      message: 'Event deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      error: 'Delete Failed',
      message: error.message || 'Failed to delete event',
    });
  }
});

export default router;
