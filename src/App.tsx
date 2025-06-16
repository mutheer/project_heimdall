import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Threats from './pages/Threats';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ExternalSystems from './pages/ExternalSystems';
import Login from './pages/Login';
import { UserProvider } from './context/UserContext';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <UserProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="devices" element={<Devices />} />
          <Route path="threats" element={<Threats />} />
          <Route path="reports" element={<Reports />} />
          <Route path="external-systems" element={<ExternalSystems />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </UserProvider>
  );
}

export default App;