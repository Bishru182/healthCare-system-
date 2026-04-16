import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { doctorService } from '../../services/doctorService'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import '../patient/PatientDashboard.css'

const blankMed = { name: '', dosage: '', frequency: '', duration: '', instructions: '' }

export default function DoctorPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    patientId: '',
    appointmentId: '',
    patientName: '',
    diagnosis: '',
    notes: '',
    medications: [ { ...blankMed } ],
  })
  const toast = useToast()
  const location = useLocation()

  useEffect(() => {
    loadPrescriptions()
    const appt = location.state?.appointment
    if (appt) {
      setForm(f => ({
        ...f,
        patientId: appt.patientId || '',
        appointmentId: appt._id || '',
      }))
    }
  }, [location.state])

  const loadPrescriptions = async () => {
    try {
      const { data } = await doctorService.listMyPrescriptions()
      setPrescriptions(data.prescriptions || [])
    } catch {
      toast.error('Failed to load prescriptions.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleMedChange = (idx, field, value) => {
    setForm(p => {
      const meds = [...p.medications]
      meds[idx] = { ...meds[idx], [field]: value }
      return { ...p, medications: meds }
    })
  }

  const addMed = () => setForm(p => ({ ...p, medications: [...p.medications, { ...blankMed }] }))
  const removeMed = (idx) =>
    setForm(p => ({ ...p, medications: p.medications.filter((_, i) => i !== idx) }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.patientId) {
      toast.error('Patient ID is required.')
      return
    }
    if (form.medications.some(m => !m.name || !m.dosage || !m.frequency || !m.duration)) {
      toast.error('Each medication needs name, dosage, frequency, and duration.')
      return
    }
    setSaving(true)
    try {
      const { data } = await doctorService.createPrescription(form)
      setPrescriptions(prev => [data.prescription, ...prev])
      toast.success('Prescription issued.')
      setForm({
        patientId: '', appointmentId: '', patientName: '', diagnosis: '', notes: '',
        medications: [ { ...blankMed } ],
      })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue prescription.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner size="lg" text="Loading prescriptions..." />

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h1 className="page-title">Prescriptions</h1>
        <p className="page-subtitle">Issue digital prescriptions and browse what you've prescribed.</p>
      </div>

      <div className="appt-layout">
        <div className="card">
          <div className="card-header"><h2 className="card-title">💊 New Prescription</h2></div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Patient ID *</label>
                  <input name="patientId" className="form-input" value={form.patientId} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Appointment ID</label>
                  <input name="appointmentId" className="form-input" value={form.appointmentId} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Patient Name</label>
                <input name="patientName" className="form-input" value={form.patientName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Diagnosis</label>
                <input name="diagnosis" className="form-input" value={form.diagnosis} onChange={handleChange} />
              </div>

              <h3 style={{ marginTop: 12, marginBottom: 8, fontSize: '0.95rem' }}>Medications</h3>
              {form.medications.map((m, idx) => (
                <div key={idx} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Name *</label>
                      <input className="form-input" value={m.name} onChange={(e) => handleMedChange(idx, 'name', e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Dosage *</label>
                      <input className="form-input" placeholder="500mg" value={m.dosage} onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Frequency *</label>
                      <input className="form-input" placeholder="3 times a day" value={m.frequency} onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Duration *</label>
                      <input className="form-input" placeholder="7 days" value={m.duration} onChange={(e) => handleMedChange(idx, 'duration', e.target.value)} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Instructions</label>
                    <input className="form-input" placeholder="After meals" value={m.instructions} onChange={(e) => handleMedChange(idx, 'instructions', e.target.value)} />
                  </div>
                  {form.medications.length > 1 && (
                    <button type="button" className="btn btn-danger" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => removeMed(idx)}>Remove</button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-secondary" onClick={addMed}>➕ Add Medication</button>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Notes</label>
                <textarea name="notes" className="form-textarea" rows={3} value={form.notes} onChange={handleChange} />
              </div>

              <button type="submit" className="btn btn-primary btn-full" disabled={saving} style={{ marginTop: 8 }}>
                {saving ? <Spinner size="sm" /> : '✍️ Issue Prescription'}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="card-title">History</h2></div>
          <div className="card-body">
            {prescriptions.length === 0 ? (
              <EmptyState icon="💊" title="No prescriptions yet" message="Your issued prescriptions will appear here." />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {prescriptions.map(p => (
                  <li key={p._id} style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{p.patientName || String(p.patientId).slice(-6)}</strong>
                      <small style={{ color: '#64748b' }}>{new Date(p.issuedDate).toLocaleDateString()}</small>
                    </div>
                    {p.diagnosis && <p style={{ margin: '4px 0', color: '#475569' }}>🩺 {p.diagnosis}</p>}
                    <ul style={{ paddingLeft: 18, margin: 0 }}>
                      {p.medications.map((m, i) => (
                        <li key={i} style={{ fontSize: '0.85rem', color: '#334155' }}>
                          <strong>{m.name}</strong> — {m.dosage}, {m.frequency} for {m.duration}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
