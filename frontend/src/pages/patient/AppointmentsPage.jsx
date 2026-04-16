import { useState } from 'react'
import mockDoctors, { specialties } from '../../data/mockDoctors'
import { appointmentService } from '../../services/appointmentService'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import './PatientDashboard.css'
import './Appointments.css'

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
]

export default function AppointmentsPage() {
  const [specialty, setSpecialty] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const filteredDoctors = specialty
    ? mockDoctors.filter((d) => d.specialty === specialty)
    : mockDoctors

  const selectedDoctor = mockDoctors.find((d) => d.id === doctorId)

  // minimum tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!doctorId || !date || !time) {
      toast.error('Please fill in all required fields.')
      return
    }
    setSubmitting(true)
    try {
      await appointmentService.create({
        doctorId,
        date,
        time,
        reason,
      })
      toast.success('Appointment booked successfully! 🎉')
      // reset
      setSpecialty('')
      setDoctorId('')
      setDate('')
      setTime('')
      setReason('')
    } catch (err) {
      const msg = err.response?.data?.message || 'Booking failed. Please try again.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h1 className="page-title">Book Appointment</h1>
        <p className="page-subtitle">Select a specialty, choose a doctor, and pick your preferred time.</p>
      </div>

      <div className="appt-layout">
        {/* Booking Form */}
        <div className="card appt-form-card">
          <div className="card-header">
            <h2 className="card-title">📅 New Appointment</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="appt-form">

              {/* Step 1 — Specialty */}
              <div className="appt-step">
                <div className="appt-step-num">1</div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="appt-specialty" className="form-label">Specialty</label>
                  <select
                    id="appt-specialty"
                    className="form-select"
                    value={specialty}
                    onChange={(e) => { setSpecialty(e.target.value); setDoctorId('') }}
                  >
                    <option value="">All Specialties</option>
                    {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Step 2 — Doctor */}
              <div className="appt-step">
                <div className="appt-step-num">2</div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="appt-doctor" className="form-label">Select Doctor <span className="required">*</span></label>
                  <select
                    id="appt-doctor"
                    className="form-select"
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose a doctor --</option>
                    {filteredDoctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} — {d.specialty}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 3 — Date */}
              <div className="appt-step">
                <div className="appt-step-num">3</div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="appt-date" className="form-label">Date <span className="required">*</span></label>
                  <input
                    id="appt-date"
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={minDate}
                    required
                  />
                </div>
              </div>

              {/* Step 4 — Time */}
              <div className="appt-step">
                <div className="appt-step-num">4</div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Time Slot <span className="required">*</span></label>
                  <div className="time-grid">
                    {TIME_SLOTS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`time-slot ${time === t ? 'time-slot-active' : ''}`}
                        onClick={() => setTime(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 5 — Reason */}
              <div className="appt-step">
                <div className="appt-step-num">5</div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="appt-reason" className="form-label">Reason for Visit</label>
                  <textarea
                    id="appt-reason"
                    className="form-textarea"
                    placeholder="Briefly describe your symptoms or reason..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={submitting}>
                {submitting ? <Spinner size="sm" /> : '✅ Confirm Booking'}
              </button>
            </form>
          </div>
        </div>

        {/* Doctor Card Preview */}
        <div className="appt-sidebar">
          {selectedDoctor ? (
            <div className="doctor-preview card fade-in">
              <div className="doctor-avatar">{selectedDoctor.avatar}</div>
              <h3 className="doctor-name">{selectedDoctor.name}</h3>
              <p className="doctor-specialty">{selectedDoctor.specialty}</p>
              <div className="doctor-meta">
                <div className="doctor-meta-item">
                  <span className="meta-label">Experience</span>
                  <span className="meta-value">{selectedDoctor.experience}</span>
                </div>
                <div className="doctor-meta-item">
                  <span className="meta-label">Rating</span>
                  <span className="meta-value">⭐ {selectedDoctor.rating} / 5.0</span>
                </div>
              </div>
              {date && time && (
                <div className="booking-summary">
                  <p className="booking-summary-label">Booking Summary</p>
                  <p>📅 {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  <p>🕐 {time}</p>
                  {reason && <p>📝 {reason.slice(0, 60)}{reason.length > 60 ? '...' : ''}</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="doctor-placeholder">
              <span>👨‍⚕️</span>
              <p>Select a doctor to see their details</p>
            </div>
          )}

          {/* Mock info note */}
          <div className="mock-notice">
            <span>🔬</span>
            <p>Doctor Service integration coming soon. Currently using curated mock doctors.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
