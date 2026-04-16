import { useEffect, useState } from 'react'
import { doctorService } from '../../services/doctorService'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import '../patient/PatientDashboard.css'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function DoctorAvailabilityPage() {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ dayOfWeek: 'Monday', startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30 })
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const load = async () => {
    try {
      const { data } = await doctorService.listMyAvailability()
      setSlots(data.slots || [])
    } catch {
      toast.error('Failed to load availability.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await doctorService.addSlot({
        ...form,
        slotDurationMinutes: Number(form.slotDurationMinutes),
      })
      toast.success('Availability slot added.')
      setForm({ dayOfWeek: 'Monday', startTime: '09:00', endTime: '12:00', slotDurationMinutes: 30 })
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add slot.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await doctorService.deleteSlot(id)
      toast.success('Slot removed.')
      setSlots(prev => prev.filter(s => s._id !== id))
    } catch {
      toast.error('Failed to remove slot.')
    }
  }

  if (loading) return <Spinner size="lg" text="Loading availability..." />

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h1 className="page-title">Availability Schedule</h1>
        <p className="page-subtitle">Define the days and times you are available for consultations.</p>
      </div>

      <div className="appt-layout">
        <div className="card">
          <div className="card-header"><h2 className="card-title">🗓️ Add New Slot</h2></div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Day of Week</label>
                <select name="dayOfWeek" className="form-select" value={form.dayOfWeek} onChange={handleChange}>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input type="time" name="startTime" className="form-input" value={form.startTime} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <input type="time" name="endTime" className="form-input" value={form.endTime} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Slot Duration (minutes)</label>
                <select name="slotDurationMinutes" className="form-select" value={form.slotDurationMinutes} onChange={handleChange}>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                  <option value={60}>60</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
                {saving ? <Spinner size="sm" /> : '➕ Add Slot'}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2 className="card-title">Current Schedule</h2></div>
          <div className="card-body">
            {slots.length === 0 ? (
              <EmptyState icon="🗓️" title="No availability set" message="Add a slot on the left to start receiving appointments." />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {slots.map(s => (
                  <li key={s._id} style={{
                    padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  }}>
                    <div>
                      <strong>{s.dayOfWeek}</strong>
                      <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        {s.startTime} – {s.endTime} · {s.slotDurationMinutes} min slots
                      </div>
                    </div>
                    <button className="btn btn-danger" onClick={() => handleDelete(s._id)}>Remove</button>
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
