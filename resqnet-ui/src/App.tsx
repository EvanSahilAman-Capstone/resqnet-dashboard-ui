import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Sensors from './pages/Sensors'
import { Login } from './pages/Login'
import Layout from './components/Layout'  // Contains Sidebar + Outlet

function App() {
  const { isLoading, isAuthenticated } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public: Login */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} 
        />
        
        {/* Protected: Layout with Sidebar wraps all app pages */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="sensors" element={<Sensors />} />
          {/* <Route path="settings" element={<Settings />} /> */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
