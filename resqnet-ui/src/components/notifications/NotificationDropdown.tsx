import React from 'react';
import {
  Radio, Flame, Users, UserMinus, ShieldCheck, Trash2, X, BellOff
} from 'lucide-react';
import type { AppNotification } from '../../services/notificationService';

const TYPE_ICON: Record<string, React.ReactNode> = {
  'broadcast:created':  <Radio      size={14} className="text-red-400"    />,
  'broadcast:updated':  <Radio      size={14} className="text-yellow-400" />,
  'broadcast:resolved': <Radio      size={14} className="text-green-400"  />,
  'team:member_joined': <Users      size={14} className="text-blue-400"   />,
  'team:member_kicked': <UserMinus  size={14} className="text-red-400"    />,
  'team:role_changed':  <ShieldCheck size={14} className="text-purple-400" />,
};

const formatTime = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

interface Props {
  notifications: AppNotification[];
  role:          string;
  onDismiss:     (id: string) => void;
  onDelete:      (id: string) => void;
  onClose:       () => void;
}

const NotificationDropdown: React.FC<Props> = ({
  notifications, role, onDismiss, onDelete, onClose
}) => {
  return (
    <div className="absolute right-0 top-11 z-[9999] w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <span className="text-sm font-semibold text-white">Notifications</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-800">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-500">
            <BellOff size={24} />
            <span className="text-xs">No notifications</span>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n._id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-800 transition-colors group">
              {/* Icon */}
              <div className="mt-0.5 shrink-0">
                {TYPE_ICON[n.type] ?? <Radio size={14} className="text-gray-400" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-200 leading-snug">{n.message}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{formatTime(n.created_at)}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Admin: hard delete */}
                {role === 'Admin' && (
                  <button
                    onClick={() => onDelete(n._id)}
                    className="p-1 rounded hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete permanently"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                {/* All: dismiss locally */}
                <button
                  onClick={() => onDismiss(n._id)}
                  className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  title="Dismiss"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
