import { useEffect } from 'react';
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

  useEffect(() => {
    const u1 = subscribe('broadcast:created', onCreated);
    const u2 = subscribe('broadcast:updated', onUpdated);
    const u3 = subscribe('broadcast:deleted', (d) => onDeleted(d.broadcast_id));
    return () => { u1(); u2(); u3(); };
  }, [subscribe]);
};
