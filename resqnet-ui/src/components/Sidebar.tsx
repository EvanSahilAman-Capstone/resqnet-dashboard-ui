import React from 'react';
import { Link } from 'react-router-dom';
import { 
  // Navigation icons
  MapIcon,      // Dashboard
  BellIcon,      // Alerts  
  SignalIcon,  // Sensors
  Cog6ToothIcon, // Settings
  // Bottom user/logout
  UserCircleIcon,
  ArrowRightEndOnRectangleIcon 
} from '@heroicons/react/24/outline';

const Sidebar: React.FC = () => {
  return (
    <div className="flex h-screen w-16 flex-col justify-between border-r flex-shrink-0 border-gray-100/50 bg-gradient-to-b from-white/80 to-slate-50/80 shadow-xl backdrop-blur-sm z-40">
      
      {/* Top: ResQNet Logo */}
      <div>
        <div className="inline-flex size-16 items-center justify-center">
          <span className="grid size-10 place-content-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 text-white font-bold text-lg shadow-lg border-2 border-white/50">
            
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col space-y-2 px-2 py-4">
        
        {/* Dashboard - Active style */}
        <Link 
          to="/dashboard" 
          className="group relative flex justify-center p-3 rounded-xl bg-gradient-to-r from-red-100/50 to-orange-100/50 text-red-700 shadow-md hover:shadow-lg hover:scale-[1.05] transition-all duration-200 border border-red-200/50 active:scale-[0.98]"
          title="Dashboard"
        >
          <MapIcon className="size-6 opacity-90 group-hover:opacity-100" />
          <span className="invisible absolute left-full top-1/2 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-gray-900/95 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm border border-gray-800/50 group-hover:visible z-50">
            Dashboard
          </span>
        </Link>

        {/* Alerts */}
        <Link 
          to="/alerts" 
          className="group relative flex justify-center p-3 rounded-xl text-gray-600 hover:bg-gray-50/80 hover:text-red-600 hover:shadow-md hover:scale-[1.05] transition-all duration-200 active:scale-[0.98]"
          title="Alerts"
        >
          <BellIcon className="size-6 opacity-75 group-hover:opacity-100" />
          <span className="invisible absolute left-full top-1/2 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-gray-900/95 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm border border-gray-800/50 group-hover:visible z-50">
            Alerts
          </span>
        </Link>

        {/* Sensors */}
        <Link 
          to="/sensors" 
          className="group relative flex justify-center p-3 rounded-xl text-gray-600 hover:bg-emerald-50/80 hover:text-emerald-600 hover:shadow-md hover:scale-[1.05] transition-all duration-200 active:scale-[0.98]"
          title="Sensors"
        >
          <SignalIcon className="size-6 opacity-75 group-hover:opacity-100" />
          <span className="invisible absolute left-full top-1/2 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-gray-900/95 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm border border-gray-800/50 group-hover:visible z-50">
            Sensors
          </span>
        </Link>

        <Link 
          to="/profile" 
          className="group relative flex w-full justify-center p-3 rounded-2xl text-gray-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 hover:shadow-lg hover:scale-[1.05] transition-all duration-200 active:scale-[0.98]"
          title="Profile"
        >
          <UserCircleIcon className="size-6 opacity-75 group-hover:opacity-100" />
          <span className="invisible absolute left-full top-1/2 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-gray-900/95 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm border border-gray-800/50 group-hover:visible z-50">
            Profile
          </span>
        </Link>

        {/* Settings */}
        <Link 
          to="/settings" 
          className="mt-auto group relative flex justify-center p-3 rounded-xl text-gray-600 hover:bg-blue-50/80 hover:text-blue-600 hover:shadow-md hover:scale-[1.05] transition-all duration-200 active:scale-[0.98]"
          title="Settings"
        >
          <Cog6ToothIcon className="size-6 opacity-75 group-hover:opacity-100" />
          <span className="invisible absolute left-full top-1/2 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-gray-900/95 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm border border-gray-800/50 group-hover:visible z-50">
            Settings
          </span>
        </Link>    

        <Link 
          to="/logout" 
          className="group relative flex w-full justify-center p-3 mt-2 rounded-2xl text-gray-500 hover:bg-red-50 hover:text-red-600 hover:shadow-lg hover:scale-[1.05] transition-all duration-200 active:scale-[0.98]"
          title="Logout"
        >
          <ArrowRightEndOnRectangleIcon className="size-6 opacity-75 group-hover:opacity-100" />
          <span className="invisible absolute left-full top-1/2 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-gray-900/95 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm border border-gray-800/50 group-hover:visible z-50">
            Sign Out
          </span>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
