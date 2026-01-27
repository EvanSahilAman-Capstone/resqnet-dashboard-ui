import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
// import Settings from './pages/Settings'
import Sensors from './pages/Sensors'
import { Login } from './pages/Login'

function App() {
  const { isLoading, isAuthenticated } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {isAuthenticated ? (
          <Route path="/*" element={
            <>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/sensors" element={<Sensors />} />
                {/* <Route path="/settings" element={<Settings />} /> */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </>
          } />
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
  )
}

export default App
