import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated, loginWithRedirect } = useAuth0();

  React.useEffect(() => {
    if (!isAuthenticated) {
      loginWithRedirect();
    }
  }, [isAuthenticated, loginWithRedirect]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
      <div className="text-xl font-bold">ResQNet</div>
      <div className="space-x-4">
        <Link className="hover:bg-gray-700 px-3 py-1 rounded" to="/">Dashboard</Link>
        <Link className="hover:bg-gray-700 px-3 py-1 rounded" to="/alerts">Alerts</Link>
        <Link className="hover:bg-gray-700 px-3 py-1 rounded" to="/sensors">Sensors</Link>
        <Link className="hover:bg-gray-700 px-3 py-1 rounded" to="/settings">Settings</Link>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-300">{user?.name || user?.email}</span>
        <button
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin + '/login' } })}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
