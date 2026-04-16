import { useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmModal from '../components/ConfirmModal'
import './DashboardLayout.css'

const patientNav = [
  { to: '/patient/dashboard',     label: 'Dashboard',       icon: '⚡' },
  { to: '/patient/profile',       label: 'My Profile',      icon: '👤' },
  { to: '/patient/reports',       label: 'Medical Reports', icon: '📋' },
  { to: '/patient/appointments',  label: 'Appointments',    icon: '📅' },
  { to: '/patient/doctors',       label: 'Find a Doctor',   icon: '🔍' },
  { to: '/patient/consultations', label: 'Video Consults',  icon: '🎥' },
  { to: '/patient/history',       label: 'History',         icon: '🕐' },
  { to: '/patient/prescriptions', label: 'Prescriptions',   icon: '💊' },
]

const doctorNav = [
  { to: '/doctor/dashboard',     label: 'Dashboard',     icon: '⚡' },
  { to: '/doctor/profile',       label: 'My Profile',    icon: '👤' },
  { to: '/doctor/availability',  label: 'Availability',  icon: '🗓️' },
  { to: '/doctor/appointments',  label: 'Appointments',  icon: '📅' },
  { to: '/doctor/consultations', label: 'Video Sessions', icon: '🎥' },
  { to: '/doctor/prescriptions', label: 'Prescriptions', icon: '💊' },
]

export default function DashboardLayout() {
  const { user, role, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const navItems = role === 'doctor' ? doctorNav : patientNav
  const roleLabel = role === 'doctor' ? 'Doctor' : 'Patient'
  const displayName = role === 'doctor'
    ? `Dr. ${user?.name || ''}`
    : (user?.name || 'Patient')

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully.')
    navigate('/login')
  }

  return (
    <div className="dashboard-root">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-icon">⚕️</span>
          <span className="logo-text">Medico</span>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{displayName.charAt(0).toUpperCase() || 'U'}</div>
          <div>
            <p className="sidebar-username">{displayName}</p>
            <p className="sidebar-role">{roleLabel}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="sidebar-logout" onClick={() => setShowLogoutModal(true)}>
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-navbar">
          <button
            className="navbar-hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <div className="navbar-brand">
            <span className="logo-icon">⚕️</span>
            <span className="navbar-brand-text">Medico</span>
          </div>
          <div className="navbar-right">
            <span className="navbar-greeting">
              Hello, {displayName.split(' ')[0] || 'there'} 👋
            </span>
          </div>
        </header>

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>

      <ConfirmModal
        isOpen={showLogoutModal}
        title="Confirm Logout"
        message="Are you sure you want to log out of your Medico account?"
        confirmLabel="Logout"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </div>
  )
}
