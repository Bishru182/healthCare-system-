import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { doctorService } from '../../services/doctorService'
import { telemedicineService } from '../../services/telemedicineService'
import '../patient/PatientDashboard.css'

const quickLinks = [
  { to: '/doctor/availability',  label: 'Set Availability', icon: '🗓️', color: '#0ea5e9' },
  { to: '/doctor/appointments',  label: 'Appointments',     icon: '📅', color: '#6366f1' },
  { to: '/doctor/consultations', label: 'Video Sessions',   icon: '🎥', color: '#10b981' },
  { to: '/doctor/prescriptions', label: 'Prescriptions',    icon: '💊', color: '#f59e0b' },
]

export default function DoctorDashboardPage() {
  const { user } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const [stats, setStats] = useState({ pending: '—', upcoming: '—', completed: '—', sessions: '—' })

  useEffect(() => {
    doctorService.listMyAppointments()
      .then(({ data }) => {
        const list = data.appointments || []
        const today = new Date(); today.setHours(0,0,0,0)
        const pending = list.filter(a => a.status === 'pending').length
        const upcoming = list.filter(a => a.status !== 'cancelled' && new Date(a.date) >= today).length
        const completed = list.filter(a => a.status === 'completed').length
        setStats(prev => ({ ...prev, pending, upcoming, completed }))
      })
      .catch(() => {})

    telemedicineService.listMine()
      .then(({ data }) => {
        setStats(prev => ({ ...prev, sessions: data.count ?? 0 }))
      })
      .catch(() => setStats(prev => ({ ...prev, sessions: 0 })))
  }, [])

  const statCards = [
    { label: 'Pending Requests', value: stats.pending,   icon: '⏳', color: 'var(--warning)' },
    { label: 'Upcoming',         value: stats.upcoming,  icon: '📅', color: 'var(--primary)' },
    { label: 'Completed',        value: stats.completed, icon: '✅', color: 'var(--success)' },
    { label: 'Video Sessions',   value: stats.sessions,  icon: '🎥', color: 'var(--accent)'  },
  ]

  return (
    <div className="dashboard-page fade-in">
      <div className="dash-hero">
        <div>
          <h1 className="dash-greeting">{greeting}, Dr. {user?.name?.split(' ')[0] || 'Doctor'} 👋</h1>
          <p className="dash-subtext">Welcome to your practice dashboard.</p>
        </div>
        <div className="dash-hero-badge">
          <span>👨‍⚕️</span>
          <span>Doctor Portal</span>
        </div>
      </div>

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

      {user?.isVerified === false && (
        <div className="health-tip" style={{ background: '#fef3c7', borderColor: '#fcd34d' }}>
          <span className="tip-icon">⚠️</span>
          <div>
            <strong>Verification Pending</strong>
            <p>Your account is not yet verified by an administrator. You can still receive bookings, but verified doctors appear first in search results.</p>
          </div>
        </div>
      )}
    </div>
  )
}
