import { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useWebSocketContext } from '../context/WebSocketContext';
import { fetchNotifications, deleteNotification, type AppNotification } from '../services/notificationService';

export const useNotifications = () => {
  const { getAccessTokenSilently } = useAuth0();
  const { subscribe } = useWebSocketContext();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading]             = useState(true);

  // initial fetch
  useEffect(() => {
    const load = async () => {
      const token = await getAccessTokenSilently();
      const data  = await fetchNotifications(token);
      setNotifications(data);
      setLoading(false);
    };
    load();
  }, []);

  // real-time: prepend new notifications
  useEffect(() => {
    const unsub = subscribe('notification:new', (data: AppNotification) => {
      setNotifications((prev) => [data, ...prev]);
    });
    return unsub;
  }, [subscribe]);

  const remove = useCallback(async (id: string) => {
    const token = await getAccessTokenSilently();
    await deleteNotification(token, id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  }, []);

  // dismiss locally (no API call — frontend only)
  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  }, []);

  return { notifications, loading, remove, dismiss };
};
