import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
      <div className="text-xl font-bold">ResQNet</div>
      <div className="space-x-4">
        <Link className="hover:bg-gray-700 px-3 py-1 rounded" to="/">Dashboard</Link>
        <Link className="hover:bg-gray-700 px-3 py-1 rounded" to="/alerts">Alerts</Link>
        <Link className="hover:bg-gray-700 px-3 py-1 rounded" to="/sensors">Sensors</Link>
        <Link className="hover:bg-gray-700 px-3 py-1 rounded" to="/settings">Settings</Link>
      </div>
    </nav>
  );
};

export default Navbar;