const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface AppNotification {
  _id:            string;
  type:           string;
  message:        string;
  data:           Record<string, any>;
  target_role:    string;
  target_user_id: string | null;
  created_at:     string;
}

export const fetchNotifications = async (token: string): Promise<AppNotification[]> => {
  const res = await fetch(`${API_BASE}/notifications/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  const json = await res.json();
  return json.notifications;
};

export const deleteNotification = async (token: string, id: string): Promise<void> => {
  await fetch(`${API_BASE}/notifications/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
};
