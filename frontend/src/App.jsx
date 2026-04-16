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
import DoctorsListPage      from './pages/patient/DoctorsListPage'

// Doctor pages
import DoctorDashboardPage     from './pages/doctor/DoctorDashboardPage'
import DoctorProfilePage       from './pages/doctor/DoctorProfilePage'
import DoctorAvailabilityPage  from './pages/doctor/DoctorAvailabilityPage'
import DoctorAppointmentsPage  from './pages/doctor/DoctorAppointmentsPage'
import DoctorPrescriptionsPage from './pages/doctor/DoctorPrescriptionsPage'

// Telemedicine
import SessionsListPage from './pages/telemedicine/SessionsListPage'
import VideoRoomPage    from './pages/telemedicine/VideoRoomPage'

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
                <Route path="/patient/dashboard"            element={<PatientDashboardPage />} />
                <Route path="/patient/profile"              element={<ProfilePage />} />
                <Route path="/patient/reports"              element={<ReportsPage />} />
                <Route path="/patient/appointments"         element={<AppointmentsPage />} />
                <Route path="/patient/doctors"              element={<DoctorsListPage />} />
                <Route path="/patient/consultations"        element={<SessionsListPage />} />
                <Route path="/patient/consultations/:id"    element={<VideoRoomPage />} />
                <Route path="/patient/history"              element={<HistoryPage />} />
                <Route path="/patient/prescriptions"        element={<PrescriptionsPage />} />
              </Route>
            </Route>

            {/* Protected doctor routes */}
            <Route element={<PrivateRoute role="doctor" />}>
              <Route element={<DashboardLayout />}>
                <Route path="/doctor/dashboard"           element={<DoctorDashboardPage />} />
                <Route path="/doctor/profile"             element={<DoctorProfilePage />} />
                <Route path="/doctor/availability"        element={<DoctorAvailabilityPage />} />
                <Route path="/doctor/appointments"        element={<DoctorAppointmentsPage />} />
                <Route path="/doctor/prescriptions"       element={<DoctorPrescriptionsPage />} />
                <Route path="/doctor/consultations"       element={<SessionsListPage />} />
                <Route path="/doctor/consultations/:id"   element={<VideoRoomPage />} />
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
