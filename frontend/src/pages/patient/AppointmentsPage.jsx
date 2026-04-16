import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doctorService } from '../../services/doctorService'
import { appointmentService } from '../../services/appointmentService'
import { telemedicineService } from '../../services/telemedicineService'
import { patientService } from '../../services/patientService'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import './PatientDashboard.css'
import './Appointments.css'

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
]

export default function AppointmentsPage() {
  const [searchParams] = useSearchParams()
  const preselected = searchParams.get('doctorId') || ''
  const [doctors, setDoctors] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [specialty, setSpecialty] = useState('')
  const [doctorId, setDoctorId] = useState(preselected)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [appointments, setAppointments] = useState([])
  const [loadingAppts, setLoadingAppts] = useState(true)
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    doctorService.listAll({ onlyVerified: true }).then(({ data }) => setDoctors(data.doctors || [])).catch(() => {})
    doctorService.getSpecialties().then(({ data }) => setSpecialties(data.specialties || [])).catch(() => {})
    loadAppointments()
  }, [])

  const loadAppointments = async () => {
    try {
      const { data } = await patientService.getHistory()
      setAppointments(data.appointments || [])
    } catch {
      // silent
    } finally {
      setLoadingAppts(false)
    }
  }

  const filteredDoctors = specialty
    ? doctors.filter((d) => d.specialty === specialty)
    : doctors

  const selectedDoctor = doctors.find((d) => d._id === doctorId)

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
      await appointmentService.create({ doctorId, date, time, reason })
      toast.success('Appointment booked successfully! 🎉')
      setSpecialty(''); setDoctorId(''); setDate(''); setTime(''); setReason('')
      loadAppointments()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleJoinVideo = async (apptId) => {
    try {
      const { data } = await telemedicineService.createSession(apptId)
      navigate(`/patient/consultations/${data.session._id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start video session.')
    }
  }

  const handleCancel = async (apptId) => {
    try {
      await appointmentService.deleteById(apptId)
      toast.success('Appointment cancelled.')
      loadAppointments()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancel failed.')
    }
  }

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h1 className="page-title">Appointments</h1>
        <p className="page-subtitle">Book a new appointment or manage your existing ones.</p>
      </div>

      <div className="appt-layout">
        <div className="card appt-form-card">
          <div className="card-header"><h2 className="card-title">📅 New Appointment</h2></div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="appt-form">
              <div className="appt-step">
                <div className="appt-step-num">1</div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Specialty</label>
                  <select className="form-select" value={specialty}
                    onChange={(e) => { setSpecialty(e.target.value); setDoctorId('') }}>
                    <option value="">All Specialties</option>
                    {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="appt-step">
                <div className="appt-step-num">2</div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Select Doctor <span className="required">*</span></label>
                  <select className="form-select" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
                    <option value="">-- Choose a doctor --</option>
                    {filteredDoctors.map((d) => (
                      <option key={d._id} value={d._id}>Dr. {d.name} — {d.specialty}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="appt-step">
                <div className="appt-step-num">3</div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Date <span className="required">*</span></label>
                  <input type="date" className="form-input" value={date}
                    onChange={(e) => setDate(e.target.value)} min={minDate} required />
                </div>
              </div>

              <div className="appt-step">
                <div className="appt-step-num">4</div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Time Slot <span className="required">*</span></label>
                  <div className="time-grid">
                    {TIME_SLOTS.map((t) => (
                      <button key={t} type="button"
                        className={`time-slot ${time === t ? 'time-slot-active' : ''}`}
                        onClick={() => setTime(t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="appt-step">
                <div className="appt-step-num">5</div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Reason for Visit</label>
                  <textarea className="form-textarea" rows={3} value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Briefly describe your symptoms..." />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={submitting}>
                {submitting ? <Spinner size="sm" /> : '✅ Confirm Booking'}
              </button>
            </form>
          </div>
        </div>

        <div className="appt-sidebar">
          {selectedDoctor ? (
            <div className="doctor-preview card fade-in">
              <div className="doctor-avatar">{selectedDoctor.name.charAt(0).toUpperCase()}</div>
              <h3 className="doctor-name">Dr. {selectedDoctor.name}</h3>
              <p className="doctor-specialty">{selectedDoctor.specialty}</p>
              <div className="doctor-meta">
                <div className="doctor-meta-item">
                  <span className="meta-label">Experience</span>
                  <span className="meta-value">{selectedDoctor.experience || 0} yrs</span>
                </div>
                <div className="doctor-meta-item">
                  <span className="meta-label">Rating</span>
                  <span className="meta-value">⭐ {(selectedDoctor.rating || 0).toFixed(1)}</span>
                </div>
              </div>
              {selectedDoctor.consultationFee > 0 && (
                <div style={{ marginTop: 8, fontWeight: 700 }}>Fee: LKR {selectedDoctor.consultationFee}</div>
              )}
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
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: 32 }}>My Appointments</h2>
      {loadingAppts ? (
        <Spinner />
      ) : appointments.length === 0 ? (
        <EmptyState icon="📅" title="No appointments yet" message="Book one using the form above." />
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={th}>Doctor</th>
                  <th style={th}>Date</th>
                  <th style={th}>Time</th>
                  <th style={th}>Status</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(a => {
                  const doc = doctors.find(d => d._id === String(a.doctorId))
                  return (
                    <tr key={a._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={td}>{doc ? `Dr. ${doc.name}` : String(a.doctorId).slice(-6)}</td>
                      <td style={td}>{new Date(a.date).toLocaleDateString()}</td>
                      <td style={td}>{a.time}</td>
                      <td style={td}><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {a.status === 'confirmed' && (
                            <button className="btn btn-primary" style={btnSm} onClick={() => handleJoinVideo(a._id)}>🎥 Join Video</button>
                          )}
                          {(a.status === 'pending' || a.status === 'confirmed') && (
                            <button className="btn btn-danger" style={btnSm} onClick={() => handleCancel(a._id)}>Cancel</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const th = { textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.875rem' }
const td = { padding: '12px 16px', color: '#1e293b', fontSize: '0.9rem' }
const btnSm = { padding: '6px 10px', fontSize: '0.8rem' }
