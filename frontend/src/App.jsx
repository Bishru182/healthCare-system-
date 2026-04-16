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
import PaymentHistory       from './pages/patient/PaymentHistory'
import MakePayment          from './pages/patient/MakePayment'
import PaymentDetails       from './pages/patient/PaymentDetails'

// Admin pages
import AdminPayments        from './pages/admin/AdminPayments'
import AdminPaymentDetails  from './pages/admin/AdminPaymentDetails'

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
                <Route path="/patient/payments"      element={<PaymentHistory />} />
                <Route path="/patient/payments/make" element={<MakePayment />} />
                <Route path="/patient/payments/:id"  element={<PaymentDetails />} />
              </Route>
            </Route>

            {/* Protected admin routes */}
            <Route element={<PrivateRoute role="admin" />}>
              <Route element={<DashboardLayout />}>
                <Route path="/admin/payments"        element={<AdminPayments />} />
                <Route path="/admin/payments/:id"    element={<AdminPaymentDetails />} />
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
