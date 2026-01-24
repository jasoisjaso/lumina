import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, DateSelectArg, EventContentArg } from '@fullcalendar/core';
import { eventsAPI, UnifiedEvent, CreateEventRequest, UpdateEventRequest } from '../api/events.api';
import { useAuthStore } from '../stores/auth.store';
import { usePullToRefresh } from '../hooks/useTouchGestures';
import { useFeatures } from '../hooks/useFeatures';

interface CalendarProps {
  onError?: (error: string) => void;
}

const Calendar: React.FC<CalendarProps> = ({ onError }) => {
  const { user } = useAuthStore();
  const { features } = useFeatures();
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<UnifiedEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  // Form state for event creation/editing
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    allDay: false,
  });

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const calendarApi = calendarRef.current?.getApi();
      const view = calendarApi?.view;

      const params = {
        start: view?.activeStart?.toISOString(),
        end: view?.activeEnd?.toISOString(),
      };

      const response = await eventsAPI.getUnifiedEvents(params);
      setEvents(response.events);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load events';
      onError?.(errorMessage);
      console.error('Load events error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Pull-to-refresh for mobile
  const { ref: pullToRefreshRef, isPullRefreshing } = usePullToRefresh<HTMLDivElement>(loadEvents);

  useEffect(() => {
    loadEvents();
  }, []);

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedDateRange({
      start: selectInfo.start,
      end: selectInfo.end,
    });
    setFormData({
      title: '',
      description: '',
      location: '',
      allDay: selectInfo.allDay,
    });
    setShowCreateModal(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const eventId = clickInfo.event.id;
    const event = events.find((e) => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setFormData({
        title: event.title,
        description: event.description || '',
        location: event.metadata.location || '',
        allDay: event.allDay,
      });
      setShowEventModal(true);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateRange) return;

    try {
      const eventData: CreateEventRequest = {
        title: formData.title,
        description: formData.description || undefined,
        location: formData.location || undefined,
        startTime: selectedDateRange.start.toISOString(),
        endTime: selectedDateRange.end.toISOString(),
        allDay: formData.allDay,
        userId: user?.id,
      };

      await eventsAPI.createEvent(eventData);
      setShowCreateModal(false);
      setSelectedDateRange(null);
      await loadEvents();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create event';
      onError?.(errorMessage);
      console.error('Create event error:', err);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || selectedEvent.type !== 'calendar') return;

    try {
      const eventId = parseInt(selectedEvent.id.replace('calendar-', ''));
      const updates: UpdateEventRequest = {
        title: formData.title,
        description: formData.description || undefined,
        location: formData.location || undefined,
        allDay: formData.allDay,
      };

      await eventsAPI.updateEvent(eventId, updates);
      setShowEventModal(false);
      setSelectedEvent(null);
      await loadEvents();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update event';
      onError?.(errorMessage);
      console.error('Update event error:', err);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || selectedEvent.type !== 'calendar') return;
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const eventId = parseInt(selectedEvent.id.replace('calendar-', ''));
      await eventsAPI.deleteEvent(eventId);
      setShowEventModal(false);
      setSelectedEvent(null);
      await loadEvents();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to delete event';
      onError?.(errorMessage);
      console.error('Delete event error:', err);
    }
  };

  const handleDatesSet = () => {
    loadEvents();
  };

  // Filter out WooCommerce orders if workflow feature is disabled
  const filteredEvents = events.filter((event) => {
    // Hide order events when WooCommerce is disabled
    if (event.type === 'order' && !features?.workflow?.enabled) {
      return false;
    }
    return true;
  });

  // Transform UnifiedEvent to FullCalendar event format with Skylight colors
  const calendarEvents = filteredEvents.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    backgroundColor: event.type === 'order' ? '#10B981' : event.metadata.color || '#4F46E5',
    borderColor: event.type === 'order' ? '#059669' : event.metadata.color || '#4338CA',
    extendedProps: {
      type: event.type,
      description: event.description,
      source: event.source,
      status: event.status,
      metadata: event.metadata,
    },
  }));

  const renderEventContent = (eventInfo: EventContentArg) => {
    const isOrder = eventInfo.event.extendedProps.type === 'order';
    return (
      <div className="p-1 overflow-hidden">
        <div className="font-medium text-xs truncate">
          {isOrder && '🛒 '}
          {eventInfo.event.title}
        </div>
        {eventInfo.event.extendedProps.status && (
          <div className="text-xs opacity-75 truncate">
            {eventInfo.event.extendedProps.status}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
      {/* Pull-to-refresh indicator */}
      {isPullRefreshing && (
        <div className="flex justify-center py-2">
          <svg
            className="w-5 h-5 text-indigo-600 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
      )}

      <div className="mb-4 md:mb-6 flex justify-between items-center gap-2">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl md:text-2xl font-semibold text-slate-800 truncate">Calendar</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1 hidden sm:block">Your family's schedule at a glance</p>
        </div>
        <button
          onClick={loadEvents}
          disabled={isLoading || isPullRefreshing}
          className="px-3 md:px-4 py-2 md:py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2 flex-shrink-0"
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          <svg
            className={`w-4 h-4 md:w-5 md:h-5 ${isLoading || isPullRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="hidden sm:inline">{isLoading || isPullRefreshing ? 'Loading...' : 'Refresh'}</span>
        </button>
      </div>

      <div ref={pullToRefreshRef} className="bg-slate-50 rounded-xl p-2 md:p-4 border border-slate-100">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next',
            center: 'title',
            right: 'today',
          }}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          events={calendarEvents}
          select={handleDateSelect}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          eventContent={renderEventContent}
          height="auto"
          contentHeight="auto"
          aspectRatio={1.5}
          handleWindowResize={true}
          eventMinHeight={48}
        />
      </div>

      {/* Create Event Modal - Skylight Style */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-end md:items-center justify-center z-50 backdrop-blur-sm"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl p-6 max-w-md w-full mx-0 md:mx-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Create Event</h3>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                  Title *
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Event title"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                  placeholder="Add details..."
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">
                  Location
                </label>
                <input
                  id="location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Where is this happening?"
                />
              </div>

              <div className="flex items-center p-3 bg-slate-50 rounded-lg">
                <input
                  id="allDay"
                  type="checkbox"
                  checked={formData.allDay}
                  onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                />
                <label htmlFor="allDay" className="ml-3 text-sm font-medium text-slate-700">
                  All day event
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedDateRange(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-lg transition-all shadow-md hover:shadow-lg"
                  style={{ minHeight: '44px' }}
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Details/Edit Modal - Skylight Style */}
      {showEventModal && selectedEvent && (
        <div
          className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-end md:items-center justify-center z-50 backdrop-blur-sm"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl p-6 max-w-md w-full mx-0 md:mx-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 ${selectedEvent.type === 'order' ? 'bg-emerald-100' : 'bg-indigo-100'} rounded-xl flex items-center justify-center`}>
                  {selectedEvent.type === 'order' ? (
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-slate-800">
                  {selectedEvent.type === 'order' ? 'Order Details' : 'Event Details'}
                </h3>
              </div>
              {selectedEvent.type === 'calendar' && (
                <button
                  onClick={handleDeleteEvent}
                  className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  style={{ minHeight: '36px', minWidth: '60px' }}
                >
                  Delete
                </button>
              )}
            </div>

            {selectedEvent.type === 'order' ? (
              // Read-only order view
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Order ID</p>
                  <p className="text-lg font-semibold text-emerald-900">#{selectedEvent.metadata.originalId}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-500 mb-1">Customer</p>
                    <p className="text-sm font-medium text-slate-800">{selectedEvent.metadata.customerName}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-medium text-slate-500 mb-1">Status</p>
                    <p className="text-sm font-medium text-slate-800 capitalize">{selectedEvent.status}</p>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200">
                  <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-indigo-900">${selectedEvent.metadata.total?.toFixed(2)}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 mb-1">Order Date</p>
                  <p className="text-sm text-slate-700">{new Date(selectedEvent.start).toLocaleString()}</p>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowEventModal(false);
                      setSelectedEvent(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    style={{ minHeight: '44px' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              // Editable calendar event form
              <form onSubmit={handleUpdateEvent} className="space-y-4">
                <div>
                  <label htmlFor="edit-title" className="block text-sm font-medium text-slate-700 mb-1">
                    Title *
                  </label>
                  <input
                    id="edit-title"
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="edit-description" className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="edit-description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="edit-location" className="block text-sm font-medium text-slate-700 mb-1">
                    Location
                  </label>
                  <input
                    id="edit-location"
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="flex items-center p-3 bg-slate-50 rounded-lg">
                  <input
                    id="edit-allDay"
                    type="checkbox"
                    checked={formData.allDay}
                    onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                  />
                  <label htmlFor="edit-allDay" className="ml-3 text-sm font-medium text-slate-700">
                    All day event
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEventModal(false);
                      setSelectedEvent(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    style={{ minHeight: '44px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 rounded-lg transition-all shadow-md hover:shadow-lg"
                    style={{ minHeight: '44px' }}
                  >
                    Update Event
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
