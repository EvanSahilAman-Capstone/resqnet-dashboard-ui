import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

type WSMessage = { event: string; data: any };
type Listener  = (data: any) => void;

interface WebSocketContextType {
  subscribe:   (event: string, fn: Listener) => () => void;
  joinTeam:    (teamId: string) => void;
  leaveTeam:   (teamId: string) => void;
  connected:   boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const wsRef        = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    let ws: WebSocket;

    const connect = async () => {
      const token = await getAccessTokenSilently();
      ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen  = () => setConnected(true);
      ws.onclose = () => { setConnected(false); setTimeout(connect, 3000); };
      ws.onerror = (e) => console.error('WS error:', e);

      ws.onmessage = (e) => {
        const msg: WSMessage = JSON.parse(e.data);
        console.log('[WS IN]', msg.event, msg.data);  // ← TEMPORARY DEBUG
        const handlers = listenersRef.current.get(msg.event);
        handlers?.forEach((fn) => fn(msg.data));
      };
    };

    connect();
    return () => { ws?.close(); };
  }, [isAuthenticated]);

  const subscribe = (event: string, fn: Listener) => {
    if (!listenersRef.current.has(event)) listenersRef.current.set(event, new Set());
    listenersRef.current.get(event)!.add(fn);
    return () => listenersRef.current.get(event)?.delete(fn);
  };

  const joinTeam  = (teamId: string) =>
    wsRef.current?.send(JSON.stringify({ action: 'join_team', team_id: teamId }));

  const leaveTeam = (teamId: string) =>
    wsRef.current?.send(JSON.stringify({ action: 'leave_team', team_id: teamId }));

  return (
    <WebSocketContext.Provider value={{ subscribe, joinTeam, leaveTeam, connected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocketContext must be used inside WebSocketProvider');
  return ctx;
};
