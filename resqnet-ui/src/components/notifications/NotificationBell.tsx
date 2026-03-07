import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

interface Props {
  onFlyTo?: (lat: number, lng: number) => void;
}

const NotificationBell: React.FC<Props> = ({ onFlyTo }) => {
  const { user }                                    = useAuth0();
  const { notifications, dismiss, remove, clearAll } = useNotifications();
  const [open, setOpen]                             = useState(false);
  const ref                                         = useRef<HTMLDivElement>(null);
  const role  = (user as any)?.['https://resqnet.com/role'] ?? 'Users';
  const count = notifications.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors"
        title="Notifications"
      >
        <Bell size={15} className="text-gray-600" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center shadow">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          notifications={notifications}
          role={role}
          onDismiss={dismiss}
          onDelete={remove}
          onClearAll={clearAll}
          onClose={() => setOpen(false)}
          onFlyTo={onFlyTo}
        />
      )}
    </div>
  );
};

export default NotificationBell;
