import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/patientService'
import { doctorAuthService } from '../../services/doctorService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import './Auth.css'

const ROLES = [
  { key: 'patient', label: 'Patient', icon: '🏥', desc: 'Book appointments & manage health records' },
  { key: 'doctor',  label: 'Doctor',  icon: '👨‍⚕️', desc: 'Manage your schedule & patients' },
  { key: 'admin',   label: 'Admin',   icon: '🛡️', desc: 'Platform administration' },
]

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState('patient')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedRole === 'admin') {
      toast.info('Admin portal is coming soon.')
      return
    }
    setLoading(true)
    try {
      if (selectedRole === 'patient') {
        const { data } = await authService.login({ email, password })
        login(data.patient, 'patient', data.token)
        toast.success(`Welcome back, ${data.patient.name}!`)
        navigate('/patient/dashboard')
      } else {
        const { data } = await doctorAuthService.login({ email, password })
        login(data.doctor, 'doctor', data.token)
        toast.success(`Welcome back, Dr. ${data.doctor.name}!`)
        navigate('/doctor/dashboard')
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="auth-brand-icon">⚕️</span>
          <span className="auth-brand-name">Medico</span>
        </div>
        <h1 className="auth-headline">Your Health,<br />Our Priority.</h1>
        <p className="auth-subline">Smart healthcare management for patients, doctors, and administrators — all in one platform.</p>
        <div className="auth-features">
          {['Book appointments instantly', 'Video consultations with doctors', 'Digital prescriptions & records'].map((f) => (
            <div key={f} className="auth-feature-item">
              <span className="auth-feature-check">✓</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <h2 className="auth-card-title">Sign In</h2>
          <p className="auth-card-sub">Select your role to continue</p>

          <div className="role-grid">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`role-card ${selectedRole === r.key ? 'role-card-active' : ''}`}
                onClick={() => setSelectedRole(r.key)}
              >
                <span className="role-icon">{r.icon}</span>
                <span className="role-label">{r.label}</span>
              </button>
            ))}
          </div>

          {selectedRole === 'admin' ? (
            <div className="placeholder-notice">
              <span className="placeholder-icon">🚧</span>
              <p><strong>Admin Portal</strong> is coming soon.</p>
              <p>Currently Patient and Doctor login are available.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="login-email" className="form-label">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="login-password" className="form-label">Password</label>
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? <Spinner size="sm" /> : `Sign In as ${selectedRole === 'patient' ? 'Patient' : 'Doctor'}`}
              </button>
            </form>
          )}

          <p className="auth-switch">
            Don't have an account? <Link to="/signup">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
