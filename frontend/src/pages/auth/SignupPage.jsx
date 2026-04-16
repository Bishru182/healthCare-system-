import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/patientService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import './Auth.css'

const ROLES = [
  { key: 'patient', label: 'Patient', icon: '🏥' },
  { key: 'doctor',  label: 'Doctor',  icon: '👨‍⚕️' },
  { key: 'admin',   label: 'Admin',   icon: '🛡️' },
]

export default function SignupPage() {
  const [selectedRole, setSelectedRole] = useState('patient')
  const [form, setForm] = useState({ name: '', email: '', password: '', age: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedRole !== 'patient') {
      toast.info('Registration for this role is not available yet.')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        ...(form.age && { age: Number(form.age) }),
        ...(form.phone && { phone: form.phone }),
      }
      const { data } = await authService.register(payload)
      login(data.patient, 'patient', data.token)
      toast.success(`Welcome to Medico, ${data.patient.name}!`)
      navigate('/patient/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.[0]?.msg
        || 'Registration failed. Please try again.'
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
        <h1 className="auth-headline">Join Medico<br />Today.</h1>
        <p className="auth-subline">Create your account and take control of your healthcare journey.</p>
        <div className="auth-features">
          {['Free to register', 'Secure & private records', 'Cancel appointments anytime'].map((f) => (
            <div key={f} className="auth-feature-item">
              <span className="auth-feature-check">✓</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card auth-card-wide">
          <h2 className="auth-card-title">Create Account</h2>
          <p className="auth-card-sub">Select your role to get started</p>

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

          {selectedRole !== 'patient' ? (
            <div className="placeholder-notice">
              <span className="placeholder-icon">🚧</span>
              <p><strong>{selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Registration</strong> is coming soon.</p>
              <p>Please contact the administrator to set up your account.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="signup-name" className="form-label">Full Name <span className="required">*</span></label>
                  <input
                    id="signup-name"
                    type="text"
                    name="name"
                    className="form-input"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-email" className="form-label">Email <span className="required">*</span></label>
                  <input
                    id="signup-email"
                    type="email"
                    name="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="signup-password" className="form-label">Password <span className="required">*</span></label>
                <input
                  id="signup-password"
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="signup-age" className="form-label">Age</label>
                  <input
                    id="signup-age"
                    type="number"
                    name="age"
                    className="form-input"
                    placeholder="e.g. 30"
                    value={form.age}
                    onChange={handleChange}
                    min={1}
                    max={120}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="signup-phone" className="form-label">Phone</label>
                  <input
                    id="signup-phone"
                    type="tel"
                    name="phone"
                    className="form-input"
                    placeholder="+1 555 000 0000"
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? <Spinner size="sm" /> : 'Create Account'}
              </button>
            </form>
          )}

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
