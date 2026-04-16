import { useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmModal from '../components/ConfirmModal'
import './DashboardLayout.css'

const patientNavItems = [
  { to: '/patient/dashboard',     label: 'Dashboard',       icon: '⚡' },
  { to: '/patient/profile',       label: 'My Profile',      icon: '👤' },
  { to: '/patient/reports',       label: 'Medical Reports', icon: '📋' },
  { to: '/patient/appointments',  label: 'Appointments',    icon: '📅' },
  { to: '/patient/history',       label: 'History',         icon: '🕐' },
  { to: '/patient/prescriptions', label: 'Prescriptions',   icon: '💊' },
  { to: '/patient/payments',      label: 'Payments',        icon: '💳' },
]

const adminNavItems = [
  { to: '/admin/payments',        label: 'Payment Management', icon: '💳' },
]

export default function DashboardLayout() {
  const { user, logout, role } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // Select nav items based on user role
  const navItems = role === 'admin' ? adminNavItems : patientNavItems

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully.')
    navigate('/login')
  }

  return (
    <div className="dashboard-root">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-icon">⚕️</span>
          <span className="logo-text">Medico</span>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.name?.charAt(0).toUpperCase() || 'U'}</div>
          <div>
            <p className="sidebar-username">{user?.name || 'User'}</p>
            <p className="sidebar-role">{role === 'admin' ? 'Administrator' : 'Patient'}</p>
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

      {/* ── Main content ── */}
      <div className="dashboard-main">
        {/* Top Navbar */}
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
            <span className="navbar-greeting">Hello, {user?.name?.split(' ')[0] || 'Patient'} 👋</span>
          </div>
        </header>

        {/* Page content */}
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
