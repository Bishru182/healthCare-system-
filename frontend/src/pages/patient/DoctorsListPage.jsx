import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doctorService } from '../../services/doctorService'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import './PatientDashboard.css'

export default function DoctorsListPage() {
  const [doctors, setDoctors] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [specialty, setSpecialty] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (specialty) params.specialty = specialty
      if (query) params.q = query
      const { data } = await doctorService.listAll(params)
      setDoctors(data.doctors || [])
    } catch {
      toast.error('Failed to load doctors.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    doctorService.getSpecialties()
      .then(({ data }) => setSpecialties(data.specialties || []))
      .catch(() => {})
    load()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    load()
  }

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h1 className="page-title">Find a Doctor</h1>
        <p className="page-subtitle">Browse verified doctors by specialty and book an appointment.</p>
      </div>

      <form onSubmit={handleSearch} className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Specialty</label>
            <select className="form-select" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
              <option value="">All Specialties</option>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 2 }}>
            <label className="form-label">Search</label>
            <input className="form-input" placeholder="Doctor name or specialty..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="form-group">
            <button type="submit" className="btn btn-primary" style={{ minWidth: 120 }}>🔍 Search</button>
          </div>
        </div>
      </form>

      {loading ? (
        <Spinner size="lg" text="Loading doctors..." />
      ) : doctors.length === 0 ? (
        <EmptyState icon="👨‍⚕️" title="No doctors found" message="Try a different specialty or search term." />
      ) : (
        <div className="quick-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {doctors.map(d => (
            <div key={d._id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                  color: 'white', fontWeight: 700, fontSize: '1.25rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {d.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong>Dr. {d.name}</strong>
                  <div style={{ color: '#64748b', fontSize: '0.875rem' }}>{d.specialty}</div>
                </div>
              </div>
              <div style={{ margin: '10px 0', fontSize: '0.875rem', color: '#475569' }}>
                ⭐ {d.rating?.toFixed(1) || '—'} · {d.experience || 0} yrs exp.
                {d.isVerified && <span style={{ marginLeft: 6, color: '#059669' }}>✓ Verified</span>}
              </div>
              {d.bio && <p style={{ fontSize: '0.85rem', color: '#334155', minHeight: 40 }}>{d.bio.slice(0, 120)}{d.bio.length > 120 ? '…' : ''}</p>}
              {d.consultationFee > 0 && (
                <div style={{ fontWeight: 600, marginTop: 4 }}>LKR {d.consultationFee}</div>
              )}
              <button
                className="btn btn-primary btn-full"
                style={{ marginTop: 10 }}
                onClick={() => navigate(`/patient/appointments?doctorId=${d._id}`)}
              >
                📅 Book Appointment
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
