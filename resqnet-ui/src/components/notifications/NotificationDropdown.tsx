import React from 'react';
import {
  Radio, Users, UserMinus, ShieldCheck, Trash2, X, BellOff, MapPin
} from 'lucide-react';
import type { AppNotification } from '../../services/notificationService';

const TYPE_ICON: Record<string, React.ReactNode> = {
  'broadcast:created':  <Radio       size={14} className="text-red-500"    />,
  'broadcast:updated':  <Radio       size={14} className="text-yellow-500" />,
  'broadcast:resolved': <Radio       size={14} className="text-green-500"  />,
  'team:member_joined': <Users       size={14} className="text-blue-500"   />,
  'team:member_kicked': <UserMinus   size={14} className="text-red-500"    />,
  'team:role_changed':  <ShieldCheck size={14} className="text-purple-500" />,
};

const formatTime = (iso: string) => {
  const ms   = Date.now() - new Date(iso).getTime();
  const diff = Math.floor(ms / 1000);
  if (isNaN(diff) || diff < 0) return 'just now';
  if (diff < 60)               return `${diff}s ago`;
  if (diff < 3600)             return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)            return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const isBroadcast = (type: string) =>
  type === 'broadcast:created' || type === 'broadcast:updated';

interface Props {
  notifications: AppNotification[];
  role:          string;
  onDismiss:     (id: string) => void;
  onDelete:      (id: string) => void;
  onClearAll:    () => void;
  onClose:       () => void;
  onFlyTo?:      (lat: number, lng: number) => void;
}

const NotificationDropdown: React.FC<Props> = ({
  notifications, role, onDismiss, onDelete, onClearAll, onClose, onFlyTo
}) => {
  const handleBroadcastClick = (n: AppNotification) => {
    if (!onFlyTo) return;
    const coords = n.data?.coordinates ?? n.data?.details?.coordinates;
    if (coords && Array.isArray(coords)) {
      onFlyTo(coords[0], coords[1]);
      onClose();
    }
  };

  return (
    <div className="absolute right-0 top-11 z-[9999] w-80 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">Notifications</span>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-[11px] text-gray-400 hover:text-red-500 transition-colors font-medium"
            >
              Clear all
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
            <BellOff size={24} />
            <span className="text-xs">No notifications</span>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              className={`flex items-start gap-3 px-4 py-3 transition-colors group
                ${isBroadcast(n.type) && onFlyTo
                  ? 'hover:bg-red-50 cursor-pointer'
                  : 'hover:bg-gray-50'
                }`}
              onClick={() => isBroadcast(n.type) && handleBroadcastClick(n)}
            >
              {/* Icon */}
              <div className="mt-0.5 shrink-0">
                {TYPE_ICON[n.type] ?? <Radio size={14} className="text-gray-400" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-800 leading-snug">{n.message}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-[10px] text-gray-400">{formatTime(n.created_at)}</p>
                  {isBroadcast(n.type) && onFlyTo && (
                    <span className="flex items-center gap-0.5 text-[10px] text-red-400">
                      <MapPin size={9} />
                      
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div
                className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                {role === 'Admin' && (
                  <button
                    onClick={() => onDelete(n._id)}
                    className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete permanently"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                <button
                  onClick={() => onDismiss(n._id)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
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
