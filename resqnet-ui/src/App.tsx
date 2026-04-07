import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Sensors from './pages/Sensors'
import TeamsPage from './pages/Teams/TeamsPage'
import MobileView from './pages/MobileView'
import { Login } from './pages/Login'
import Layout from './components/Layout'
import { PanelProvider } from './context/PanelContext'
import { WebSocketProvider } from './context/WebSocketContext'

function App() {
  const { isLoading, isAuthenticated } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <PanelProvider>
      <WebSocketProvider>
        <Router>
          <Routes>
            <Route
              path="/login"
              element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />}
            />
            <Route
              path="/"
              element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="alerts"    element={<Alerts />} />
              <Route path="sensors"   element={<Sensors />} />
              <Route path="teams"     element={<TeamsPage />} />
              <Route path="mobile"    element={<MobileView />} />
              <Route path="*"         element={<Navigate to="/dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </WebSocketProvider>
    </PanelProvider>
  )
}

export default App
