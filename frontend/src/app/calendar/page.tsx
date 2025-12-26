"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import ProtectedRoute from "@/components/ProtectedRoute";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  CalendarIcon,
  FunnelIcon,
  ListBulletIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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
      const authToken = token || localStorage.getItem("access_token");
      
      if (!authToken) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/calendar/events`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // API returns object with events array and total count
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const filterEvents = useCallback(() => {
    if (!Array.isArray(events)) {
      setFilteredEvents([]);
      return;
    }
    
    console.log(' events', events);
    let filtered = [...events];
    console.log('filttred events', filtered);

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

  const getTileContent = useCallback(({ date, view }: { date: Date; view: string }) => {
    if (view !== "month") return null;

    // Format date as YYYY-MM-DD in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    
    const eventsOnDate = filteredEvents.filter(
      (event) => event.event_date === dateString
    );

    if (eventsOnDate.length === 0) return null;

    // Get the most important event type color
    const colors = eventsOnDate.map((event) => {
      switch (event.event_type) {
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
    });

    return (
      <div className="flex justify-center mt-1">
        <div className={`w-1.5 h-1.5 rounded-full ${colors[0]}`} />
      </div>
    );
  }, [filteredEvents, calendarKey]);

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

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "MARKET_CLOSED":
        return "bg-red-100 text-red-800 border-red-300";
      case "EARLY_CLOSE":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "EARNINGS":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "ECONOMIC_DATA":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "FOMC":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "HOLIDAY":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <CalendarIcon className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Calendar Events</h1>
            </div>
            <p className="text-gray-600">
              View upcoming market events, holidays, and important dates
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-5 h-5 text-gray-500" />
                <h2 className="font-semibold text-gray-900">Filters</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "calendar"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  title="Calendar View"
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === "list"
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                  title="List View"
                >
                  <ListBulletIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Market
                </label>
                <div className="relative">
                  <select
                    value={selectedMarket}
                    onChange={(e) => setSelectedMarket(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 appearance-none cursor-pointer"
                  >
                    <option value="all">All Markets</option>
                    <option value="US">US Market</option>
                    <option value="IL">Israeli Market</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type
                </label>
                <div className="relative">
                  <select
                    value={selectedEventType}
                    onChange={(e) => setSelectedEventType(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 appearance-none cursor-pointer"
                    >
                    <option value="all">All Types</option>
                    <option value="MARKET_CLOSED">Market Closures</option>
                    <option value="EARLY_CLOSE">Early Close</option>
                    <option value="EARNINGS">Earnings</option>
                    <option value="ECONOMIC_DATA">Economic Data</option>
                    <option value="FOMC">FOMC Meetings</option>
                    <option value="HOLIDAY">Holidays</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar or List View */}
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading events...</p>
            </div>
          ) : viewMode === "calendar" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendar */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {selectedDate && !Array.isArray(selectedDate)
                    ? formatDate(selectedDate.toISOString())
                    : "Select a date"}
                </h3>
                {selectedDateEvents.length === 0 ? (
                  <p className="text-sm text-gray-500">No events on this date</p>
                ) : (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`p-3 rounded-lg border-l-4 ${
                          isPastEvent(event.event_date) ? "opacity-60" : ""
                        }`}
                        style={{
                          borderLeftColor:
                            event.event_type === "MARKET_CLOSED"
                              ? "#ef4444"
                              : event.event_type === "EARLY_CLOSE"
                              ? "#f97316"
                              : event.event_type === "EARNINGS"
                              ? "#3b82f6"
                              : event.event_type === "ECONOMIC_DATA"
                              ? "#a855f7"
                              : event.event_type === "FOMC"
                              ? "#6366f1"
                              : "#10b981",
                          backgroundColor:
                            event.event_type === "MARKET_CLOSED"
                              ? "#fef2f2"
                              : event.event_type === "EARLY_CLOSE"
                              ? "#fff7ed"
                              : event.event_type === "EARNINGS"
                              ? "#eff6ff"
                              : event.event_type === "ECONOMIC_DATA"
                              ? "#faf5ff"
                              : event.event_type === "FOMC"
                              ? "#eef2ff"
                              : "#f0fdf4",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 mb-1">
                              {event.event_name}
                            </h4>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${getEventTypeColor(
                                  event.event_type
                                )}`}
                              >
                                {formatEventType(event.event_type)}
                              </span>
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {event.market}
                              </span>
                            </div>
                            {event.early_close_time && (
                              <p className="text-xs text-gray-600 mb-1">
                                Early close: {event.early_close_time}
                              </p>
                            )}
                            {event.description && (
                              <p className="text-xs text-gray-600">{event.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No events found matching your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className={`bg-white rounded-lg shadow-sm border-l-4 p-5 transition-shadow hover:shadow-md ${
                    isPastEvent(event.event_date) ? "opacity-60" : ""
                  }`}
                  style={{
                    borderLeftColor:
                      event.event_type === "MARKET_CLOSED"
                        ? "#ef4444"
                        : event.event_type === "EARLY_CLOSE"
                        ? "#f97316"
                        : event.event_type === "EARNINGS"
                        ? "#3b82f6"
                        : event.event_type === "ECONOMIC_DATA"
                        ? "#a855f7"
                        : event.event_type === "FOMC"
                        ? "#6366f1"
                        : "#10b981",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {event.event_name}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getEventTypeColor(
                            event.event_type
                          )}`}
                        >
                          {formatEventType(event.event_type)}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                          {event.market}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {formatDate(event.event_date)}
                        {event.early_close_time && (
                          <span className="ml-2">
                            • Early close at {event.early_close_time}
                          </span>
                        )}
                      </p>
                      {event.description && (
                        <p className="text-sm text-gray-700">{event.description}</p>
                      )}
                    </div>
                    {isPastEvent(event.event_date) && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Past
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
