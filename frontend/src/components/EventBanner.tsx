

"use client";

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { calendarAPI, userSettingsAPI } from "@/services/api";
import { X, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface CalendarEvent {
  id: number;
  event_type: string;
  event_name: string;
  event_date: string;
  market: string;
  description?: string;
  early_close_time?: string;
}

const EventBanner: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchUpcomingEvents();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  const fetchUpcomingEvents = async () => {
    try {
      // Get user's notification preferences
      const prefs = await userSettingsAPI.getNotificationPreferences();
      const daysAhead = prefs.notify_days_before || 1;

      // Fetch upcoming events
      const allEvents = await calendarAPI.getUpcoming(daysAhead);

      // Filter by user's preferences
      const filteredEvents = allEvents.filter((event: CalendarEvent) => {
        const marketMatch = prefs.notify_markets.includes(event.market);
        const typeMatch = prefs.notify_event_types.includes(event.event_type);
        return marketMatch && typeMatch;
      });

      // Filter out already viewed events
      const viewedEvents = getViewedEvents();
      const unseenEvents = filteredEvents.filter(
        (event: CalendarEvent) => !viewedEvents.includes(event.id)
      );

      setEvents(unseenEvents);
      setVisible(unseenEvents.length > 0);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const getViewedEvents = (): number[] => {
    const viewed = localStorage.getItem("viewed_event_ids");
    return viewed ? JSON.parse(viewed) : [];
  };

  const markEventAsViewed = (eventId: number) => {
    const viewed = getViewedEvents();
    if (!viewed.includes(eventId)) {
      viewed.push(eventId);
      localStorage.setItem("viewed_event_ids", JSON.stringify(viewed));
    }
  };

  const handleClose = () => {
    // Mark current event as viewed
    if (events[currentIndex]) {
      markEventAsViewed(events[currentIndex].id);
    }

    // If there are more events, show the next one
    if (currentIndex < events.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // No more events, hide banner
      setVisible(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < events.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "MARKET_CLOSED":
        return "bg-red-500";
      case "EARLY_CLOSE":
        return "bg-orange-500";
      case "EARNINGS":
        return "bg-blue-500";
      case "ECONOMIC_DATA":
        return "bg-purple-500";
      case "FOMC":
        return "bg-indigo-500";
      case "HOLIDAY":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }
  };

  if (loading || !visible || events.length === 0) {
    return null;
  }

  const currentEvent = events[currentIndex];

  return (
    <div className={`${getEventTypeColor(currentEvent.event_type)} text-white w-full overflow-hidden`}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-14 gap-3 sm:gap-4">
          {/* Left: Event Icon & Info */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <Calendar className="w-6 h-6 flex-shrink-0" />
            <div className="flex flex-col justify-center min-w-0 flex-1">
              {/* Top row: Event name with marquee */}
              <div className="overflow-hidden whitespace-nowrap mb-0.5">
                <div className="inline-block animate-marquee hover:animation-paused">
                  <span className="font-semibold text-sm sm:text-base">
                    {currentEvent.event_name}
                    {currentEvent.description && (
                      <span className="text-white/90 ml-4">• {currentEvent.description}</span>
                    )}
                  </span>
                </div>
              </div>
              {/* Bottom row: Date and Market */}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm whitespace-nowrap">
                  {formatDate(currentEvent.event_date)}
                  {currentEvent.early_close_time && (
                    <span className="ml-2">• {currentEvent.early_close_time}</span>
                  )}
                </span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded whitespace-nowrap">
                  {currentEvent.market}
                </span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded whitespace-nowrap hidden sm:inline">
                  {formatEventType(currentEvent.event_type)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Navigation & Close */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {events.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="p-1 hover:bg-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous event"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <span className="text-xs sm:text-sm px-1 sm:px-2 whitespace-nowrap">
                  {currentIndex + 1} / {events.length}
                </span>
                <button
                  onClick={handleNext}
                  disabled={currentIndex === events.length - 1}
                  className="p-1 hover:bg-white/20 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next event"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded ml-1 sm:ml-2"
              aria-label="Close banner"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventBanner;
