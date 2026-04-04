"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import ProtectedRoute from "@/components/ProtectedRoute";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  CalendarDays,
  Filter,
  List,
  LayoutGrid,
} from "lucide-react";
import { calendarAPI } from "@/services/api";

interface CalendarEvent {
  id: number;
  event_type: string;
  event_name: string;
  event_date: string;
  market: string;
  description?: string;
  early_close_time?: string;
}

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function CalendarPage() {
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<string>("all");
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedDate, setSelectedDate] = useState<Value>(new Date());
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarEvent[]>([]);
  const [calendarKey, setCalendarKey] = useState(0);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await calendarAPI.getEvents();
      setEvents(data.events || []);
    } catch {
      // Failed to fetch events
    } finally {
      setLoading(false);
    }
  }, []);

  const filterEvents = useCallback(() => {
    if (!Array.isArray(events)) {
      setFilteredEvents([]);
      return;
    }
    
    let filtered = [...events];

    if (selectedMarket !== "all") {
      filtered = filtered.filter((event) => event.market === selectedMarket);
    }

    if (selectedEventType !== "all") {
      filtered = filtered.filter((event) => event.event_type === selectedEventType);
    }

    // Sort by date
    filtered.sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());

    setFilteredEvents(filtered);
  }, [events, selectedMarket, selectedEventType]);

  const updateSelectedDateEvents = useCallback(() => {
    if (!selectedDate || Array.isArray(selectedDate)) return;

    // Format date as YYYY-MM-DD in local timezone
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const eventsOnDate = filteredEvents.filter(
      (event) => event.event_date === dateString
    );
    
    setSelectedDateEvents(eventsOnDate);
  }, [selectedDate, filteredEvents]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchEvents();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, token, fetchEvents]);

  useEffect(() => {
    filterEvents();
  }, [filterEvents]);

  useEffect(() => {
    updateSelectedDateEvents();
    setCalendarKey(prev => prev + 1);
  }, [updateSelectedDateEvents]);

  const getEventDotColor = useCallback((market: string, eventType: string): string => {
    if (market === "IL") {
      switch (eventType) {
        case "MARKET_CLOSED": return "#3b82f6";   // blue-500
        case "EARLY_CLOSE":   return "#8b5cf6";   // violet-500
        default:              return "#6366f1";   // indigo-500
      }
    }
    if (market === "US") {
      switch (eventType) {
        case "MARKET_CLOSED": return "#ef4444";   // red-500
        case "EARLY_CLOSE":   return "#f97316";   // orange-500
        default:              return "#ef4444";
      }
    }
    // Future event types (any market)
    switch (eventType) {
      case "EARNINGS":      return "#4ade80";   // green-400
      case "FOMC":          return "#f59e0b";   // amber-500
      case "ECONOMIC_DATA": return "#14b8a6";   // teal-500
      default:              return "#6b7280";   // gray-500
    }
  }, []);

  const getTileContent = useCallback(({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const eventsOnDate = filteredEvents.filter((e) => e.event_date === dateString);
    if (eventsOnDate.length === 0) return null;

    // Deduplicate by color so we show at most one dot per distinct color
    const seen = new Set<string>();
    const dots: string[] = [];
    for (const event of eventsOnDate) {
      const color = getEventDotColor(event.market, event.event_type);
      if (!seen.has(color)) {
        seen.add(color);
        dots.push(color);
      }
    }

    return (
      <div className="flex justify-center gap-0.5 mt-1">
        {dots.map((color, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    );
  }, [filteredEvents, calendarKey, getEventDotColor]);

  const tileClassName = useCallback(({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return null;

    // Format date as YYYY-MM-DD in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const hasEvents = filteredEvents.some(
      (event) => event.event_date === dateString
    );

    return hasEvents ? "has-events" : null;
  }, [filteredEvents]);

  const getEventBadgeStyle = (market: string, eventType: string): React.CSSProperties => {
    const color = getEventDotColor(market, eventType);
    return {
      backgroundColor: `${color}18`,
      color: color,
      borderColor: `${color}50`,
    };
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isPastEvent = (dateString: string) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-surface-dark px-4 sm:px-6 lg:px-8 py-8">
        <div>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <CalendarDays className="w-8 h-8 text-brand-400" />
              <h1 className="text-3xl font-bold text-gray-100">Calendar Events</h1>
            </div>
            <p className="text-gray-400">
              View upcoming market events, holidays, and important dates
            </p>
          </div>

          {/* Filters */}
          <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <h2 className="font-semibold text-gray-100">Filters</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "calendar"
                      ? "bg-brand-400/10 text-brand-400"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                  title="Calendar View"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "list"
                      ? "bg-brand-400/10 text-brand-400"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                  title="List View"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Market
                </label>
                <div className="relative">
                  <select
                    value={selectedMarket}
                    onChange={(e) => setSelectedMarket(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400/40 bg-surface-dark text-gray-100 appearance-none cursor-pointer"
                  >
                    <option value="all">All Markets</option>
                    <option value="US">US Market</option>
                    <option value="IL">Israeli Market</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-300">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Type
                </label>
                <div className="relative">
                  <select
                    value={selectedEventType}
                    onChange={(e) => setSelectedEventType(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-white/10 rounded-lg focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400/40 bg-surface-dark text-gray-100 appearance-none cursor-pointer"
                    >
                    <option value="all">All Types</option>
                    <option value="MARKET_CLOSED">Market Closures</option>
                    <option value="EARLY_CLOSE">Early Close</option>
                    <option value="EARNINGS">Earnings</option>
                    <option value="ECONOMIC_DATA">Economic Data</option>
                    <option value="FOMC">FOMC Meetings</option>
                    <option value="HOLIDAY">Holidays</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-300">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-4 mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Legend</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2">
              {[
                { color: "#ef4444", label: "US — Market Closed" },
                { color: "#f97316", label: "US — Early Close" },
                { color: "#3b82f6", label: "IL — Market Closed" },
                { color: "#8b5cf6", label: "IL — Early Close" },
                { color: "#4ade80", label: "Earnings (coming soon)" },
                { color: "#f59e0b", label: "FOMC / Fed Meeting (coming soon)" },
                { color: "#14b8a6", label: "Economic Data (coming soon)" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar or List View */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400"></div>
              <p className="mt-4 text-gray-400">Loading events...</p>
            </div>
          ) : viewMode === "calendar" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <div className="lg:col-span-2 bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
                <Calendar
                  key={calendarKey}
                  onChange={setSelectedDate}
                  value={selectedDate}
                  tileContent={getTileContent}
                  tileClassName={tileClassName}
                  className="custom-calendar w-full"
                  calendarType="hebrew"
                />
              </div>

              {/* Selected Date Events */}
              <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
                <h3 className="font-semibold text-gray-100 mb-4">
                  {selectedDate && !Array.isArray(selectedDate)
                    ? formatDate(selectedDate.toISOString())
                    : "Select a date"}
                </h3>
                {selectedDateEvents.length === 0 ? (
                  <p className="text-sm text-gray-500">No events on this date</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event) => {
                      const dotColor = getEventDotColor(event.market, event.event_type);
                      return (
                        <div
                          key={event.id}
                          className={`p-3 rounded-lg border-l-4 ${isPastEvent(event.event_date) ? "opacity-60" : ""}`}
                          style={{
                            borderLeftColor: dotColor,
                            backgroundColor: `${dotColor}14`,
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-100 mb-1">
                              {event.event_name}
                            </h4>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <span
                                className="px-2 py-0.5 rounded text-xs font-medium border"
                                style={getEventBadgeStyle(event.market, event.event_type)}
                              >
                                {formatEventType(event.event_type)}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-gray-200">
                                {event.market}
                              </span>
                            </div>
                            {event.early_close_time && (
                              <p className="text-xs text-gray-400 mb-1">
                                Early close: {event.early_close_time}
                              </p>
                            )}
                            {event.description && (
                              <p className="text-xs text-gray-400">{event.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-12 text-center">
              <CalendarDays className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No events found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => {
                const dotColor = getEventDotColor(event.market, event.event_type);
                return (
                  <div
                    key={event.id}
                    className={`bg-surface-dark-secondary rounded-xl border-l-4 p-5 transition-all hover:bg-white/5 ${
                      isPastEvent(event.event_date) ? "opacity-60" : ""
                    }`}
                    style={{ borderLeftColor: dotColor }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-100">
                            {event.event_name}
                          </h3>
                          <span
                            className="px-3 py-1 rounded-full text-xs font-medium border"
                            style={getEventBadgeStyle(event.market, event.event_type)}
                          >
                            {formatEventType(event.event_type)}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-gray-200 border border-white/10">
                            {event.market}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">
                          {formatDate(event.event_date)}
                          {event.early_close_time && (
                            <span className="ml-2">
                              • Early close at {event.early_close_time}
                            </span>
                          )}
                        </p>
                        {event.description && (
                          <p className="text-sm text-gray-300">{event.description}</p>
                        )}
                      </div>
                      {isPastEvent(event.event_date) && (
                        <span className="text-xs text-gray-500 bg-white/10 px-2 py-1 rounded">
                          Past
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
