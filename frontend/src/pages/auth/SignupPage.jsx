import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../../services/patientService'
import { doctorAuthService, doctorService } from '../../services/doctorService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import './Auth.css'

const ROLES = [
  { key: 'patient', label: 'Patient', icon: '🏥' },
  { key: 'doctor',  label: 'Doctor',  icon: '👨‍⚕️' },
  { key: 'admin',   label: 'Admin',   icon: '🛡️' },
]

const initialPatient = { name: '', email: '', password: '', age: '', phone: '' }
const initialDoctor  = {
  name: '', email: '', password: '', specialty: '', phone: '',
  licenseNumber: '', experience: '', consultationFee: '', bio: '',
}

export default function SignupPage() {
  const [selectedRole, setSelectedRole] = useState('patient')
  const [form, setForm] = useState(initialPatient)
  const [specialties, setSpecialties] = useState([])
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    // Prefetch specialties for doctor form (best-effort)
    doctorService.getSpecialties()
      .then(({ data }) => setSpecialties(data.specialties || []))
      .catch(() => setSpecialties([]))
  }, [])

  useEffect(() => {
    setForm(selectedRole === 'doctor' ? initialDoctor : initialPatient)
  }, [selectedRole])

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedRole === 'admin') {
      toast.info('Admin registration is handled internally.')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      if (selectedRole === 'patient') {
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
      } else {
        if (!form.specialty) {
          toast.error('Please select your specialty.')
          setLoading(false)
          return
        }
        const payload = {
          name: form.name,
          email: form.email,
          password: form.password,
          specialty: form.specialty,
          ...(form.phone && { phone: form.phone }),
          ...(form.licenseNumber && { licenseNumber: form.licenseNumber }),
          ...(form.experience && { experience: Number(form.experience) }),
          ...(form.consultationFee && { consultationFee: Number(form.consultationFee) }),
          ...(form.bio && { bio: form.bio }),
        }
        const { data } = await doctorAuthService.register(payload)
        login(data.doctor, 'doctor', data.token)
        toast.success(`Welcome to Medico, Dr. ${data.doctor.name}!`)
        navigate('/doctor/dashboard')
      }
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
          {['Free to register', 'Secure & private records', 'Video consultations'].map((f) => (
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

          {selectedRole === 'admin' ? (
            <div className="placeholder-notice">
              <span className="placeholder-icon">🚧</span>
              <p><strong>Admin Registration</strong> is handled internally by the platform operators.</p>
              <p>Please contact the administrator to set up your account.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name <span className="required">*</span></label>
                  <input type="text" name="name" className="form-input"
                    placeholder={selectedRole === 'doctor' ? 'Dr. Jane Smith' : 'John Doe'}
                    value={form.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email <span className="required">*</span></label>
                  <input type="email" name="email" className="form-input" placeholder="you@example.com"
                    value={form.email} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password <span className="required">*</span></label>
                <input type="password" name="password" className="form-input" placeholder="Min. 6 characters"
                  value={form.password} onChange={handleChange} required />
              </div>

              {selectedRole === 'patient' ? (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Age</label>
                    <input type="number" name="age" className="form-input" placeholder="e.g. 30"
                      value={form.age} onChange={handleChange} min={1} max={120} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input type="tel" name="phone" className="form-input" placeholder="+94 77 000 0000"
                      value={form.phone} onChange={handleChange} />
                  </div>
                </div>
              ) : (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Specialty <span className="required">*</span></label>
                      <select name="specialty" className="form-select"
                        value={form.specialty} onChange={handleChange} required>
                        <option value="">-- Select Specialty --</option>
                        {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input type="tel" name="phone" className="form-input" placeholder="+94 77 000 0000"
                        value={form.phone} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Medical License #</label>
                      <input type="text" name="licenseNumber" className="form-input" placeholder="SLMC/12345"
                        value={form.licenseNumber} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Experience (years)</label>
                      <input type="number" name="experience" className="form-input" placeholder="5"
                        value={form.experience} onChange={handleChange} min={0} max={60} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Consultation Fee (LKR)</label>
                    <input type="number" name="consultationFee" className="form-input" placeholder="2500"
                      value={form.consultationFee} onChange={handleChange} min={0} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Short Bio</label>
                    <textarea name="bio" className="form-textarea" rows={3}
                      placeholder="Tell patients a bit about your expertise..."
                      value={form.bio} onChange={handleChange} />
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? <Spinner size="sm" /> : `Create ${selectedRole === 'patient' ? 'Patient' : 'Doctor'} Account`}
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
