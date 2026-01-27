import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './SideBar';  // Your slim sidebar

const Layout: React.FC = () => {
  return (
    <>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        
        {/* Page content - pushed right */}
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Page-specific content */}
            <main className="flex-1 overflow-hidden">
            <Outlet />  {/* Renders Dashboard, Alerts, Sensors, etc. */}
            </main>
        </div>
      </div>
    </>
  );
};

export default Layout;