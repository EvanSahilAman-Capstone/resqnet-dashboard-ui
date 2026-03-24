import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useAuth0 } from "@auth0/auth0-react";

const WS_BASE = import.meta.env.VITE_WS_URL;

type WSMessage = { event: string; data: any };
type Listener = (data: any) => void;

interface WebSocketContextType {
  subscribe: (event: string, fn: Listener) => () => void;
  connected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { getAccessTokenSilently, isAuthenticated, user } = useAuth0();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());
  const [connected, setConnected] = useState(false);

  const subscribe = useCallback((event: string, fn: Listener) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(fn);

    return () => {
      listenersRef.current.get(event)?.delete(fn);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !WS_BASE) return;

    let cancelled = false;

    const connect = async () => {
      try {
        const token = await getAccessTokenSilently();
        if (cancelled) return;

        const params = new URLSearchParams({
          token,
          userId: user?.sub || "",
          role: user?.["http://resqnet.com/role"] || "",
        });
        const ws = new WebSocket(`${WS_BASE}?${params.toString()}`);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          console.log("[WS] connected");
        };

        ws.onclose = (e) => {
          setConnected(false);
          console.log("[WS] disconnected", e.code, e.reason);

          if (!cancelled) {
            reconnectTimerRef.current = window.setTimeout(connect, 3000);
          }
        };
        ws.onerror = (e) => {
          console.error("[WS] error:", e);
        };

        ws.onmessage = (e) => {
          try {
            const msg: WSMessage = JSON.parse(e.data);
            const handlers = listenersRef.current.get(msg.event);
            handlers?.forEach((fn) => fn(msg.data));
          } catch (err) {
            console.error("[WS] invalid message:", e.data, err);
          }
        };
      } catch (err) {
        console.error("[WS] connect failed:", err);

        if (!cancelled) {
          reconnectTimerRef.current = window.setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      cancelled = true;
      setConnected(false);

      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
      }

      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [isAuthenticated, getAccessTokenSilently, user]);

  return (
    <WebSocketContext.Provider value={{ subscribe, connected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx)
    throw new Error(
      "useWebSocketContext must be used inside WebSocketProvider",
    );
  return ctx;
};
