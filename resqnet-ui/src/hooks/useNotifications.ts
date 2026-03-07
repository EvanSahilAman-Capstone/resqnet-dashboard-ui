import { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useWebSocketContext } from '../context/WebSocketContext';
import { fetchNotifications, deleteNotification, type AppNotification } from '../services/notificationService';

const DISMISSED_KEY = 'resqnet:dismissed_notifications';

const getDismissed = (): Set<string> =>
  new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'));

const saveDismissed = (ids: Set<string>) =>
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));

export const useNotifications = () => {
  const { getAccessTokenSilently } = useAuth0();
  const { subscribe } = useWebSocketContext();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading]             = useState(true);

  // initial fetch — filter out already-dismissed ids
  useEffect(() => {
    const load = async () => {
      try {
        const token      = await getAccessTokenSilently();
        const data       = await fetchNotifications(token);
        const dismissed  = getDismissed();
        // dedup by _id and filter dismissed
        const seen = new Set<string>();
        const filtered = data.filter((n) => {
          if (dismissed.has(n._id) || seen.has(n._id)) return false;
          seen.add(n._id);
          return true;
        });
        setNotifications(filtered);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // real-time: prepend new, dedup, skip dismissed
  useEffect(() => {
    const unsub = subscribe('notification:new', (data: AppNotification) => {
      const dismissed = getDismissed();
      if (dismissed.has(data._id)) return;
      setNotifications((prev) => {
        if (prev.find((n) => n._id === data._id)) return prev; // dedup
        return [data, ...prev];
      });
    });
    return unsub;
  }, [subscribe]);

  // dismiss locally + persist to localStorage
  const dismiss = useCallback((id: string) => {
    const dismissed = getDismissed();
    dismissed.add(id);
    saveDismissed(dismissed);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  }, []);

  // clear all — persist all current ids as dismissed
  const clearAll = useCallback(() => {
    setNotifications((prev) => {
      const dismissed = getDismissed();
      prev.forEach((n) => dismissed.add(n._id));
      saveDismissed(dismissed);
      return [];
    });
  }, []);

  // hard delete (admin)
  const remove = useCallback(async (id: string) => {
    const token = await getAccessTokenSilently();
    await deleteNotification(token, id);
    dismiss(id); // also persist dismiss so it doesn't reappear
  }, [dismiss]);

  return { notifications, loading, remove, dismiss, clearAll };
};
