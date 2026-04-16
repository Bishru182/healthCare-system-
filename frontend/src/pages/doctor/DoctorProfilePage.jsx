import { useEffect, useState } from 'react'
import { doctorService } from '../../services/doctorService'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import '../patient/PatientDashboard.css'

export default function DoctorProfilePage() {
  const [profile, setProfile] = useState(null)
  const [specialties, setSpecialties] = useState([])
  const [form, setForm] = useState({
    name: '', specialty: '', phone: '', licenseNumber: '',
    experience: '', consultationFee: '', bio: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, spRes] = await Promise.all([
          doctorService.getMe(),
          doctorService.getSpecialties(),
        ])
        setProfile(profileRes.data.doctor)
        setSpecialties(spRes.data.specialties || [])
        const d = profileRes.data.doctor
        setForm({
          name: d.name || '',
          specialty: d.specialty || '',
          phone: d.phone || '',
          licenseNumber: d.licenseNumber || '',
          experience: d.experience || '',
          consultationFee: d.consultationFee || '',
          bio: d.bio || '',
        })
      } catch {
        toast.error('Failed to load profile.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        specialty: form.specialty,
        phone: form.phone,
        licenseNumber: form.licenseNumber,
        ...(form.experience !== '' && { experience: Number(form.experience) }),
        ...(form.consultationFee !== '' && { consultationFee: Number(form.consultationFee) }),
        bio: form.bio,
      }
      const { data } = await doctorService.updateMe(payload)
      setProfile(data.doctor)
      toast.success('Profile updated.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner size="lg" text="Loading profile..." />

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Keep your professional details up to date for patients.</p>
      </div>

      <div className="card" style={{ maxWidth: 720 }}>
        <div style={{ background: 'linear-gradient(135deg, #0f172a, #0c2a4e)', padding: '28px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
            {profile?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: '1.125rem' }}>Dr. {profile?.name}</p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{profile?.email}</p>
            <span className={`badge ${profile?.isVerified ? 'badge-confirmed' : 'badge-pending'}`} style={{ marginTop: '6px' }}>
              {profile?.isVerified ? '✓ Verified' : '⏳ Pending Verification'}
            </span>
          </div>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="profile-grid">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input name="name" className="form-input" value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Specialty</label>
                <select name="specialty" className="form-select" value={form.specialty} onChange={handleChange} required>
                  <option value="">-- Select --</option>
                  {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input name="phone" type="tel" className="form-input" value={form.phone} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">License #</label>
                <input name="licenseNumber" className="form-input" value={form.licenseNumber} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Experience (years)</label>
                <input type="number" name="experience" className="form-input" value={form.experience} onChange={handleChange} min={0} max={60} />
              </div>
              <div className="form-group">
                <label className="form-label">Consultation Fee (LKR)</label>
                <input type="number" name="consultationFee" className="form-input" value={form.consultationFee} onChange={handleChange} min={0} />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Short Bio</label>
              <textarea name="bio" className="form-textarea" rows={4} value={form.bio} onChange={handleChange}
                placeholder="Tell patients about your experience and approach..." />
            </div>

            <div style={{ marginTop: 24 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <Spinner size="sm" /> : '💾 Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
