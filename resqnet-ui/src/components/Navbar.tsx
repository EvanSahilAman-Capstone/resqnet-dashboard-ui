import React from 'react';

const Navbar: React.FC = () => {
  return (
    <nav className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
      <div className="text-xl font-bold">ResQNet</div>
      <div className="space-x-4">
        <button className="hover:bg-gray-700 px-3 py-1 rounded">Home</button>
        <button className="hover:bg-gray-700 px-3 py-1 rounded">Alerts</button>
        <button className="hover:bg-gray-700 px-3 py-1 rounded">Dashboard</button>
        <button className="hover:bg-gray-700 px-3 py-1 rounded">About</button>
      </div>
    </nav>
  );
};

export default Navbar;