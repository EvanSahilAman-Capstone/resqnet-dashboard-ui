import { useEffect, useRef } from 'react';
import { useWebSocketContext } from '../context/WebSocketContext';

interface BroadcastAlert {
  _id:      string;
  message:  string;
  priority: string;
  radius:   number;
  status:   string;
  position: [number, number];
  [key: string]: any;
}

export const useBroadcastSocket = (
  onCreated: (b: BroadcastAlert) => void,
  onUpdated: (b: BroadcastAlert) => void,
  onDeleted: (id: string)        => void,
) => {
  const { subscribe } = useWebSocketContext();

  // Keep refs always pointing to the latest callbacks
  const onCreatedRef = useRef(onCreated);
  const onUpdatedRef = useRef(onUpdated);
  const onDeletedRef = useRef(onDeleted);

  // Update refs on every render — no stale closures
  useEffect(() => { onCreatedRef.current = onCreated; }, [onCreated]);
  useEffect(() => { onUpdatedRef.current = onUpdated; }, [onUpdated]);
  useEffect(() => { onDeletedRef.current = onDeleted; }, [onDeleted]);

  // Subscribe ONCE with stable wrapper functions that call the latest ref
  useEffect(() => {
    const u1 = subscribe('broadcast:created', (d) => onCreatedRef.current(d));
    const u2 = subscribe('broadcast:updated', (d) => onUpdatedRef.current(d));
    const u3 = subscribe('broadcast:deleted', (d) => onDeletedRef.current(d.broadcast_id));
    return () => { u1(); u2(); u3(); };
  }, [subscribe]); // only re-subscribe if WS context changes (reconnect)
};