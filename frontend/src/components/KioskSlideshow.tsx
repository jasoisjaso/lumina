import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';
import photoGalleryAPI, { Photo } from '../api/photo-gallery.api';
import { eventsAPI, UnifiedEvent } from '../api/events.api';
import { weatherAPI } from '../api/weather.api';
import { useSettingsStore } from '../stores/settings.store';

interface KioskSlideshowProps {
  onExit: () => void;
  slideDuration?: number; // seconds
  enabledSources?: ('photos' | 'calendar' | 'weather' | 'dashboard')[];
}

type SlideType = 'photo' | 'calendar' | 'weather' | 'dashboard';

interface Slide {
  type: SlideType;
  data: any;
}

const KioskSlideshow: React.FC<KioskSlideshowProps> = ({
  onExit,
  slideDuration = 15,
  enabledSources = ['photos', 'calendar', 'weather', 'dashboard'],
}) => {
  const { user } = useAuthStore();
  const { features } = useSettingsStore();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load slideshow content
  useEffect(() => {
    const loadSlides = async () => {
      const newSlides: Slide[] = [];

      // Load photos if enabled
      if (enabledSources.includes('photos') && features.photoGallery?.enabled) {
        try {
          const { photos } = await photoGalleryAPI.getAllPhotos(1, 20, 'newest');
          photos.forEach((photo) => {
            newSlides.push({ type: 'photo', data: photo });
          });
        } catch (err) {
          console.error('Failed to load photos for slideshow:', err);
        }
      }

      // Load upcoming events if enabled
      if (enabledSources.includes('calendar')) {
        try {
          const now = new Date();
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          const { events } = await eventsAPI.getUnifiedEvents({
            start: now.toISOString(),
            end: tomorrow.toISOString(),
          });
          if (events.length > 0) {
            newSlides.push({ type: 'calendar', data: events.slice(0, 5) });
          }
        } catch (err) {
          console.error('Failed to load events for slideshow:', err);
        }
      }

      // Add weather slide if enabled
      if (enabledSources.includes('weather') && features.weather?.enabled) {
        newSlides.push({ type: 'weather', data: null });
      }

      // Add dashboard slide if enabled
      if (enabledSources.includes('dashboard')) {
        newSlides.push({ type: 'dashboard', data: null });
      }

      // If no slides, add dashboard as fallback
      if (newSlides.length === 0) {
        newSlides.push({ type: 'dashboard', data: null });
      }

      setSlides(newSlides);
    };

    loadSlides();
  }, [enabledSources, features]);

  // Auto-advance slides
  useEffect(() => {
    if (slides.length === 0) return;

    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
        setIsTransitioning(false);
      }, 300);
    }, slideDuration * 1000);

    return () => clearInterval(timer);
  }, [slides.length, slideDuration]);

  const currentSlide = slides[currentIndex];

  const renderPhotoSlide = (photo: Photo) => {
    const photoUrl = user?.family_id
      ? photoGalleryAPI.getPhotoUrl(user.family_id, 'originals', photo.filename)
      : '';

    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <img
          src={photoUrl}
          alt={photo.title || photo.original_filename}
          className="max-w-full max-h-full object-contain"
        />
        {photo.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
            <h3 className="text-white text-3xl font-semibold">{photo.title}</h3>
            {photo.description && (
              <p className="text-white/90 text-xl mt-2">{photo.description}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCalendarSlide = (events: UnifiedEvent[]) => {
    const formatTime = (date: string) => {
      return new Date(date).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    };

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-12">
        <h2 className="text-5xl font-bold text-slate-800 mb-12">Upcoming Events</h2>
        <div className="space-y-6 w-full max-w-4xl">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-2xl shadow-lg p-6 border-l-8"
              style={{ borderLeftColor: event.metadata.color || '#6366f1' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-semibold text-slate-800">{event.title}</h3>
                  {event.description && (
                    <p className="text-lg text-slate-600 mt-2">{event.description}</p>
                  )}
                  {event.metadata.location && (
                    <p className="text-lg text-slate-500 mt-1">📍 {event.metadata.location}</p>
                  )}
                </div>
                <div className="text-right ml-6">
                  <p className="text-lg font-medium text-slate-700">{formatDate(event.start)}</p>
                  <p className="text-xl font-semibold text-indigo-600">
                    {formatTime(event.start)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWeatherSlide = () => {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-400 to-blue-600 p-12">
        <div className="text-center text-white">
          <h2 className="text-6xl font-bold mb-6">Weather</h2>
          <p className="text-2xl opacity-90">Weather information will be displayed here</p>
          <p className="text-xl opacity-75 mt-4">(Integration with WeatherWidget component)</p>
        </div>
      </div>
    );
  };

  const renderDashboardSlide = () => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const date = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-12">
        <div className="text-center text-white">
          <p className="text-3xl font-medium opacity-90 mb-4">{date}</p>
          <h1 className="text-9xl font-bold mb-12">{time}</h1>
          {user && (
            <p className="text-4xl font-semibold opacity-90">
              {user.first_name}'s Family Dashboard
            </p>
          )}
        </div>
      </div>
    );
  };

  if (slides.length === 0) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-slate-900 text-white cursor-pointer"
        onClick={onExit}
      >
        <div className="text-center">
          <p className="text-2xl">Loading slideshow...</p>
          <p className="text-lg mt-4 opacity-75">Tap anywhere to exit</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 cursor-pointer"
      onClick={onExit}
      style={{
        opacity: isTransitioning ? 0 : 1,
        transition: 'opacity 300ms ease-in-out',
      }}
    >
      {currentSlide?.type === 'photo' && renderPhotoSlide(currentSlide.data)}
      {currentSlide?.type === 'calendar' && renderCalendarSlide(currentSlide.data)}
      {currentSlide?.type === 'weather' && renderWeatherSlide()}
      {currentSlide?.type === 'dashboard' && renderDashboardSlide()}

      {/* Slide indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentIndex ? 'bg-white w-8' : 'bg-white/50'
            }`}
          />
        ))}
      </div>

      {/* Exit hint */}
      <div className="absolute top-8 right-8 bg-black/50 text-white px-4 py-2 rounded-lg text-lg">
        Tap anywhere to exit
      </div>
    </div>
  );
};

export default KioskSlideshow;
