import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Account from './pages/Account';
import Sensors from './pages/Sensors';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />      {/* / → Dashboard */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="sensors" element={<Sensors />} />
          <Route path="account" element={<Account />} />
        </Route>
      </Routes> 
    </Router>
  )
}

export default App
