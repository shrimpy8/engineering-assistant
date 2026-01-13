'use client';

import { useState, useCallback } from 'react';
import type { ToolTraceEvent } from '@/types';

interface UseToolTraceReturn {
  events: ToolTraceEvent[];
  addEvent: (event: ToolTraceEvent) => void;
  updateEvent: (id: string, updates: Partial<ToolTraceEvent>) => void;
  clearEvents: () => void;
  getEventById: (id: string) => ToolTraceEvent | undefined;
  isExpanded: Record<string, boolean>;
  toggleExpanded: (id: string) => void;
}

/**
 * Hook for managing tool trace events
 * Tracks all MCP tool calls for transparency
 */
export function useToolTrace(): UseToolTraceReturn {
  const [events, setEvents] = useState<ToolTraceEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({});

  const addEvent = useCallback((event: ToolTraceEvent) => {
    setEvents((prev) => [...prev, event]);
  }, []);

  const updateEvent = useCallback((id: string, updates: Partial<ToolTraceEvent>) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === id ? { ...event, ...updates } : event
      )
    );
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setIsExpanded({});
  }, []);

  const getEventById = useCallback(
    (id: string) => events.find((event) => event.id === id),
    [events]
  );

  const toggleExpanded = useCallback((id: string) => {
    setIsExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  return {
    events,
    addEvent,
    updateEvent,
    clearEvents,
    getEventById,
    isExpanded,
    toggleExpanded,
  };
}
