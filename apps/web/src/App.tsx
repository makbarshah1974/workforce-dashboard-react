import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workers from './pages/Workers';
import WorkerDetail from './pages/WorkerDetail';
import Machines from './pages/Machines';
import MachineDetail from './pages/MachineDetail';
import Production from './pages/Production';
import ProductionDetail from './pages/ProductionDetail';
import ProductionRuns from './pages/ProductionRuns';
import Shifts from './pages/Shifts';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Help from './pages/Help';
import Profile from './pages/Profile';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="workers" element={<Workers />} />
            <Route path="workers/:id" element={<WorkerDetail />} />
            <Route path="machines" element={<Machines />} />
            <Route path="machines/:id" element={<MachineDetail />} />
            <Route path="production" element={<Production />} />
            <Route path="production/:id" element={<ProductionDetail />} />
            <Route path="runs" element={<ProductionRuns />} />
            <Route path="shifts" element={<Shifts />} />
            <Route path="reports" element={<Reports />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="help" element={<Help />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster position="bottom-right" theme="dark" />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;