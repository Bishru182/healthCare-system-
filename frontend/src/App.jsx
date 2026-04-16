import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import PrivateRoute from './routes/PrivateRoute'
import DashboardLayout from './layouts/DashboardLayout'

// Auth pages
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'

// Patient pages
import PatientDashboardPage from './pages/patient/PatientDashboardPage'
import ProfilePage          from './pages/patient/ProfilePage'
import ReportsPage          from './pages/patient/ReportsPage'
import AppointmentsPage     from './pages/patient/AppointmentsPage'
import HistoryPage          from './pages/patient/HistoryPage'
import PrescriptionsPage    from './pages/patient/PrescriptionsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login"  element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected patient routes */}
            <Route element={<PrivateRoute role="patient" />}>
              <Route element={<DashboardLayout />}>
                <Route path="/patient/dashboard"     element={<PatientDashboardPage />} />
                <Route path="/patient/profile"       element={<ProfilePage />} />
                <Route path="/patient/reports"       element={<ReportsPage />} />
                <Route path="/patient/appointments"  element={<AppointmentsPage />} />
                <Route path="/patient/history"       element={<HistoryPage />} />
                <Route path="/patient/prescriptions" element={<PrescriptionsPage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
