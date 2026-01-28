import React from 'react';
import { NavLink, Link } from 'react-router-dom';  // ← NavLink not Link
import { 
  HomeIcon, BellIcon, SignalIcon,
  UserCircleIcon, ArrowRightEndOnRectangleIcon 
} from '@heroicons/react/24/outline';
import Logo from '../assets/logo.jpg'

const Sidebar: React.FC = () => {
  return (
    <div className="flex h-screen w-16 flex-col justify-between border-r flex-shrink-0 border-gray-100/50 bg-gradient-to-b from-white/80 to-slate-50/80 shadow-xl backdrop-blur-sm z-40">
      
      {/* Logo */}
      <div className="pt-6">
        <div className="inline-flex size-16 items-center justify-center">
          <img src={Logo} className="size-11 place-content-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 text-white font-bold text-lg shadow-lg border-2 border-white/50" />
        </div>
      </div>

      {/* Main Nav */}
      <div className="flex-1 flex flex-col space-y-2 px-2 py-6">
        
        {/* Dashboard */}
        <NavLink 
          to="/dashboard"
          className={({ isActive }) => 
            `group relative flex justify-center p-3 rounded-xl hover:shadow-lg hover:scale-[1.05] transition-all duration-200 active:scale-[0.98] 
             ${isActive 
               ? 'bg-gradient-to-r from-red-100/70 to-orange-100/70 text-red-700 border-red-200/60' 
               : 'text-gray-600 hover:bg-gray-50/80 hover:text-red-600 hover:border-red-200/30 border-gray-200/30'
             }`
          }
          title="Dashboard"
        >
          {({ isActive }) => (
            <>
              <HomeIcon className={`size-6 transition-opacity ${isActive ? 'opacity-100' : 'opacity-75 group-hover:opacity-100'}`} />
              <span className="invisible absolute left-full top-1/2 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-gray-900/95 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm border border-gray-800/50 group-hover:visible z-50">
                Dashboard
              </span>
            </>
          )}
        </NavLink>

        {/* Alerts */}
        <NavLink 
          to="/alerts"
          className={({ isActive }) => 
            `group relative flex justify-center p-3 rounded-xl hover:shadow-md hover:scale-[1.05] transition-all duration-200 active:scale-[0.98] 
             ${isActive 
               ? 'bg-red-50/80 text-red-600 border-red-200/60 shadow-md border' 
               : 'text-gray-600 hover:bg-red-50/80 hover:text-red-600 border-transparent'
             }`
          }
          title="Alerts"
        >
          {({ isActive }) => (
            <>
              <BellIcon className={`size-6 transition-opacity ${isActive ? 'opacity-100' : 'opacity-75 group-hover:opacity-100'}`} />
              <span className="invisible absolute left-full top-1/2 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-gray-900/95 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm border border-gray-800/50 group-hover:visible z-50">
                Alerts
              </span>
            </>
          )}
        </NavLink>

        {/* Sensors */}
        <NavLink 
          to="/sensors"
          className={({ isActive }) => 
            `group relative flex justify-center p-3 rounded-xl hover:shadow-md hover:scale-[1.05] transition-all duration-200 active:scale-[0.98] 
             ${isActive 
               ? 'bg-emerald-50/80 text-emerald-600 border-emerald-200/60 shadow-md border' 
               : 'text-gray-600 hover:bg-emerald-50/80 hover:text-emerald-600 border-transparent'
             }`
          }
          title="Sensors"
        >
          {({ isActive }) => (
            <>
              <SignalIcon className={`size-6 transition-opacity ${isActive ? 'opacity-100' : 'opacity-75 group-hover:opacity-100'}`} />
              <span className="invisible absolute left-full top-1/2 ms-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-gray-900/95 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm border border-gray-800/50 group-hover:visible z-50">
                Sensors
              </span>
            </>
          )}
        </NavLink>
      </div>

      {/* Bottom: Profile/Logout (not active) */}
      <div className="px-2 py-4 border-t border-gray-100/50 bg-white/50 backdrop-blur-sm space-y-2">
        <Link to="/profile" className="group relative flex justify-center p-3 rounded-2xl text-gray-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 hover:shadow-lg hover:scale-[1.05] transition-all duration-200 active:scale-[0.98]">
          <UserCircleIcon className="size-6 opacity-75 group-hover:opacity-100" />
        </Link>
        <Link to="/logout" className="group relative flex justify-center p-3 rounded-2xl text-gray-500 hover:bg-red-50 hover:text-red-600 hover:shadow-lg hover:scale-[1.05] transition-all duration-200 active:scale-[0.98]">
          <ArrowRightEndOnRectangleIcon className="size-6 opacity-75 group-hover:opacity-100" />
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
