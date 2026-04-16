import { useAuth } from '../../context/AuthContext'
import './PatientDashboard.css'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { patientService } from '../../services/patientService'

const quickLinks = [
  { to: '/patient/appointments', label: 'Book Appointment', icon: '📅', color: '#0ea5e9' },
  { to: '/patient/reports',      label: 'Upload Report',    icon: '📋', color: '#6366f1' },
  { to: '/patient/history',      label: 'View History',     icon: '🕐', color: '#10b981' },
  { to: '/patient/prescriptions',label: 'Prescriptions',    icon: '💊', color: '#f59e0b' },
]

export default function PatientDashboardPage() {
  const { user } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const [stats, setStats] = useState({
    upcoming: '—',
    reports: '—',
    completed: '—',
  })

  useEffect(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Fetch appointment history for upcoming + completed counts
    patientService.getHistory()
      .then(({ data }) => {
        const appointments = data.appointments || []
        const upcoming = appointments.filter(
          (a) => a.status !== 'cancelled' && new Date(a.date) >= today
        ).length
        const completed = appointments.filter(
          (a) => a.status === 'completed'
        ).length
        setStats((prev) => ({ ...prev, upcoming, completed }))
      })
      .catch(() => {}) // keep '—' on error

    // Fetch reports count
    patientService.getReports()
      .then(({ data }) => {
        setStats((prev) => ({ ...prev, reports: data.count ?? data.reports?.length ?? '—' }))
      })
      .catch(() => {}) // keep '—' on error
  }, [])

  const statCards = [
    { label: 'Upcoming Appointments', value: stats.upcoming,  icon: '📅', color: 'var(--primary)' },
    { label: 'Medical Reports',       value: stats.reports,   icon: '📄', color: 'var(--accent)'  },
    { label: 'Prescriptions',         value: '2',             icon: '💊', color: 'var(--success)' },
    { label: 'Completed Visits',      value: stats.completed, icon: '✅', color: 'var(--warning)' },
  ]

  return (
    <div className="dashboard-page fade-in">
      {/* Hero banner */}
      <div className="dash-hero">
        <div>
          <h1 className="dash-greeting">{greeting}, {user?.name?.split(' ')[0] || 'Patient'} 👋</h1>
          <p className="dash-subtext">Stay on top of your health. Here's your overview for today.</p>
        </div>
        <div className="dash-hero-badge">
          <span>🏥</span>
          <span>Patient Portal</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        {statCards.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.color + '1a', color: s.color }}>{s.icon}</div>
            <div>
              <p className="stat-value">{s.value}</p>
              <p className="stat-label">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="section-title">Quick Actions</h2>
      <div className="quick-grid">
        {quickLinks.map((q) => (
          <Link to={q.to} key={q.to} className="quick-card" style={{ '--accent-color': q.color }}>
            <span className="quick-icon">{q.icon}</span>
            <span className="quick-label">{q.label}</span>
            <span className="quick-arrow">→</span>
          </Link>
        ))}
      </div>

      {/* Tips */}
      <div className="health-tip">
        <span className="tip-icon">💡</span>
        <div>
          <strong>Health Tip of the Day</strong>
          <p>Regular check-ups help detect health issues early. Book your next appointment today!</p>
        </div>
      </div>
    </div>
  )
}
