import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doctorService } from '../../services/doctorService'
import { telemedicineService } from '../../services/telemedicineService'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import '../patient/PatientDashboard.css'

const STATUS_STYLES = {
  pending:   { color: '#d97706', bg: '#fef3c7', label: 'Pending' },
  confirmed: { color: '#2563eb', bg: '#dbeafe', label: 'Confirmed' },
  completed: { color: '#059669', bg: '#d1fae5', label: 'Completed' },
  cancelled: { color: '#dc2626', bg: '#fee2e2', label: 'Cancelled' },
}

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const toast = useToast()
  const navigate = useNavigate()

  const load = async () => {
    try {
      const { data } = await doctorService.listMyAppointments()
      setAppointments(data.appointments || [])
    } catch {
      toast.error('Failed to load appointments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const updateLocal = (id, updater) => {
    setAppointments(prev => prev.map(a => a._id === id ? updater(a) : a))
  }

  const handleAccept = async (id) => {
    setBusyId(id)
    try {
      await doctorService.acceptAppointment(id)
      updateLocal(id, a => ({ ...a, status: 'confirmed' }))
      toast.success('Appointment confirmed.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm.')
    } finally { setBusyId(null) }
  }

  const handleReject = async (id) => {
    setBusyId(id)
    try {
      await doctorService.rejectAppointment(id)
      updateLocal(id, a => ({ ...a, status: 'cancelled' }))
      toast.info('Appointment rejected.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject.')
    } finally { setBusyId(null) }
  }

  const handleComplete = async (id) => {
    setBusyId(id)
    try {
      await doctorService.completeAppointment(id)
      updateLocal(id, a => ({ ...a, status: 'completed' }))
      toast.success('Marked as completed.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete.')
    } finally { setBusyId(null) }
  }

  const handleStartVideo = async (appt) => {
    setBusyId(appt._id)
    try {
      const { data } = await telemedicineService.createSession(appt._id)
      navigate(`/doctor/consultations/${data.session._id}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start video session.')
    } finally { setBusyId(null) }
  }

  if (loading) return <Spinner size="lg" text="Loading appointments..." />

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h1 className="page-title">Appointments</h1>
        <p className="page-subtitle">Review, accept, or complete patient appointments.</p>
      </div>

      {appointments.length === 0 ? (
        <EmptyState icon="📅" title="No appointments yet" message="When patients book you, they will show up here." />
      ) : (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={thStyle}>Patient</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Time</th>
                    <th style={thStyle}>Reason</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map(a => {
                    const st = STATUS_STYLES[a.status] || STATUS_STYLES.pending
                    return (
                      <tr key={a._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={tdStyle}>{String(a.patientId).slice(-6)}</td>
                        <td style={tdStyle}>{new Date(a.date).toLocaleDateString()}</td>
                        <td style={tdStyle}>{a.time}</td>
                        <td style={tdStyle}>{a.reason || '—'}</td>
                        <td style={tdStyle}>
                          <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, color: st.color, background: st.bg }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {a.status === 'pending' && (
                              <>
                                <button className="btn btn-primary" style={btnSm} onClick={() => handleAccept(a._id)} disabled={busyId === a._id}>Accept</button>
                                <button className="btn btn-danger" style={btnSm} onClick={() => handleReject(a._id)} disabled={busyId === a._id}>Reject</button>
                              </>
                            )}
                            {a.status === 'confirmed' && (
                              <>
                                <button className="btn btn-primary" style={btnSm} onClick={() => handleStartVideo(a)} disabled={busyId === a._id}>🎥 Start Video</button>
                                <button className="btn btn-secondary" style={btnSm} onClick={() => handleComplete(a._id)} disabled={busyId === a._id}>Complete</button>
                              </>
                            )}
                            {a.status === 'completed' && (
                              <button className="btn btn-secondary" style={btnSm} onClick={() => navigate('/doctor/prescriptions', { state: { appointment: a } })}>
                                Write Rx
                              </button>
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
        </div>
      )}
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.875rem' }
const tdStyle = { padding: '12px 16px', color: '#1e293b', fontSize: '0.9rem', verticalAlign: 'middle' }
const btnSm = { padding: '6px 10px', fontSize: '0.8rem' }
