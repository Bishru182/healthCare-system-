import { useState, useEffect } from 'react'
import { patientService } from '../../services/patientService'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import ConfirmModal from '../../components/ConfirmModal'
import Spinner from '../../components/Spinner'
import { useNavigate } from 'react-router-dom'
import './PatientDashboard.css'

export default function ProfilePage() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', age: '', phone: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const { logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data } = await patientService.getProfile()
      setProfile(data.patient)
      setForm({
        name: data.patient.name || '',
        email: data.patient.email || '',
        age: data.patient.age || '',
        phone: data.patient.phone || '',
      })
    } catch {
      toast.error('Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        ...(form.age && { age: Number(form.age) }),
        ...(form.phone && { phone: form.phone }),
      }
      const { data } = await patientService.updateProfile(payload)
      setProfile(data.patient)
      toast.success('Profile updated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await patientService.deleteAccount()
      logout()
      toast.success('Account deleted successfully.')
      navigate('/login')
    } catch {
      toast.error('Failed to delete account.')
    }
  }

  if (loading) return <Spinner size="lg" text="Loading profile..." />

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your personal information and account settings.</p>
      </div>

      <div className="card" style={{ maxWidth: 680 }}>
        {/* Avatar Header */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a, #0c2a4e)', padding: '28px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
            {profile?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '1.125rem' }}>{profile?.name}</p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{profile?.email}</p>
            <span className="badge badge-confirmed" style={{ marginTop: '6px' }}>Patient</span>
          </div>
        </div>

        <div className="card-body">
          <form onSubmit={handleUpdate}>
            <div className="profile-grid">
              <div className="form-group">
                <label htmlFor="profile-name" className="form-label">Full Name</label>
                <input id="profile-name" name="name" type="text" className="form-input" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="profile-email" className="form-label">Email Address</label>
                <input id="profile-email" name="email" type="email" className="form-input" value={form.email} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="profile-age" className="form-label">Age</label>
                <input id="profile-age" name="age" type="number" className="form-input" value={form.age} onChange={handleChange} min={1} max={120} placeholder="e.g. 30" />
              </div>
              <div className="form-group">
                <label htmlFor="profile-phone" className="form-label">Phone Number</label>
                <input id="profile-phone" name="phone" type="tel" className="form-input" value={form.phone} onChange={handleChange} placeholder="+1 555 000 0000" />
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <Spinner size="sm" /> : '💾 Save Changes'}
              </button>
              <button type="button" className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
                🗑️ Delete Account
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Account"
        message="This will permanently delete your account and all associated data (reports, appointments). This action cannot be undone."
        confirmLabel="Delete My Account"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  )
}
