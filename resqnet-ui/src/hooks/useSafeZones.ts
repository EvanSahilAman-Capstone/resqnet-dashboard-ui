import { useEffect, useRef } from 'react';
import { useWebSocketContext } from '../context/WebSocketContext';
import type { SafeZone } from '../components/map/types';

interface UseSafeZoneSocketOptions {
  onCreated: (z: SafeZone) => void;
  onUpdated: (z: SafeZone) => void;
  onDeleted: (id: string) => void;
}

export const useSafeZoneSocket = ({
  onCreated,
  onUpdated,
  onDeleted,
}: UseSafeZoneSocketOptions) => {
  const { subscribe } = useWebSocketContext();

  const onCreatedRef = useRef(onCreated);
  const onUpdatedRef = useRef(onUpdated);
  const onDeletedRef = useRef(onDeleted);

  useEffect(() => { onCreatedRef.current = onCreated; }, [onCreated]);
  useEffect(() => { onUpdatedRef.current = onUpdated; }, [onUpdated]);
  useEffect(() => { onDeletedRef.current = onDeleted; }, [onDeleted]);

  useEffect(() => {
    const u1 = subscribe('safe_zone:created', (d) => onCreatedRef.current(d));
    const u2 = subscribe('safe_zone:updated', (d) => onUpdatedRef.current(d));
    const u3 = subscribe('safe_zone:deleted', (d) => onDeletedRef.current(d?.safe_zone_id ?? d?.id));
    return () => { u1(); u2(); u3(); };
  }, [subscribe]);
};