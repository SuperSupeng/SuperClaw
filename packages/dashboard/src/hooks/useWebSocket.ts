import { useCallback, useEffect, useRef, useState } from "react";
import type { WSEvent } from "../types";

const MAX_EVENTS = 100;
const MAX_BACKOFF = 10_000;

interface UseWebSocketOptions {
  onEvent?: (event: WSEvent) => void;
}

export function useWebSocket(options?: UseWebSocketOptions) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<WSEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000);
  const onEventRef = useRef(options?.onEvent);

  onEventRef.current = options?.onEvent;

  const connect = useCallback(() => {
    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      backoffRef.current = 1000;
    };

    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data) as WSEvent;
        setLastEvent(event);
        setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
        onEventRef.current?.(event);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      const delay = backoffRef.current;
      backoffRef.current = Math.min(delay * 2, MAX_BACKOFF);
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { connected, events, lastEvent };
}
