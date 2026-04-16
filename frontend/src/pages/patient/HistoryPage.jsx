import { useState, useEffect } from 'react'
import { patientService } from '../../services/patientService'
import { appointmentService } from '../../services/appointmentService'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import ConfirmModal from '../../components/ConfirmModal'
import mockDoctors from '../../data/mockDoctors'
import './PatientDashboard.css'
import './History.css'

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
]

const STATUS_BADGE = {
  pending:   'badge-pending',
  confirmed: 'badge-confirmed',
  completed: 'badge-completed',
  cancelled: 'badge-cancelled',
}

// minimum date = tomorrow
const getMinDate = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export default function HistoryPage() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  // Cancel state
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState(null) // appointment object
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '', reason: '' })
  const [rescheduling, setRescheduling] = useState(false)

  const toast = useToast()

  useEffect(() => { fetchHistory() }, [])

  const fetchHistory = async () => {
    try {
      const { data } = await patientService.getHistory()
      setAppointments(data.appointments || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load appointment history.')
    } finally {
      setLoading(false)
    }
  }

  // ── Cancel ──
  const handleCancel = async () => {
    setCancelling(true)
    try {
      await appointmentService.deleteById(cancelTarget)
      setAppointments((prev) =>
        prev.map((a) => a._id === cancelTarget ? { ...a, status: 'cancelled' } : a)
      )
      toast.success('Appointment cancelled successfully.')
    } catch {
      toast.error('Failed to cancel appointment.')
    } finally {
      setCancelling(false)
      setCancelTarget(null)
    }
  }

  // ── Open reschedule modal ──
  const openReschedule = (appt) => {
    // pre-fill with current values
    const currentDate = appt.date ? appt.date.split('T')[0] : ''
    setRescheduleForm({
      date: currentDate,
      time: appt.time || '',
      reason: appt.reason || '',
    })
    setRescheduleTarget(appt)
  }

  // ── Submit reschedule ──
  const handleReschedule = async (e) => {
    e.preventDefault()
    if (!rescheduleForm.date || !rescheduleForm.time) {
      toast.error('Please select a date and time.')
      return
    }
    setRescheduling(true)
    try {
      const { data } = await appointmentService.updateById(rescheduleTarget._id, {
        date:   rescheduleForm.date,
        time:   rescheduleForm.time,
        reason: rescheduleForm.reason,
      })
      // Update the row in local state with the response from backend
      setAppointments((prev) =>
        prev.map((a) => a._id === rescheduleTarget._id ? data.appointment : a)
      )
      toast.success('Appointment rescheduled successfully! ✅')
      setRescheduleTarget(null)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reschedule appointment.')
    } finally {
      setRescheduling(false)
    }
  }

  const getDoctorName = (id) => mockDoctors.find((d) => d.id === id)?.name || `Doctor #${id?.slice(-6)}`

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  })

  const canEdit = (status) => status !== 'completed' && status !== 'cancelled'

  if (loading) return <Spinner size="lg" text="Loading history..." />

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h1 className="page-title">Appointment History</h1>
        <p className="page-subtitle">View, reschedule, or cancel your appointments.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🕐 All Appointments</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {appointments.length} total
          </span>
        </div>

        {appointments.length === 0 ? (
          <EmptyState
            icon="🕐"
            title="No appointments found"
            description="Your appointment history will appear here after you book."
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a._id}>
                    <td><strong>{getDoctorName(a.doctorId)}</strong></td>
                    <td>{formatDate(a.date)}</td>
                    <td>{a.time}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.reason || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[a.status] || 'badge-pending'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      {canEdit(a.status) ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openReschedule(a)}
                          >
                            ✏️ Reschedule
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setCancelTarget(a._id)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Cancel Modal ── */}
      <ConfirmModal
        isOpen={!!cancelTarget}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? This cannot be undone."
        confirmLabel={cancelling ? 'Cancelling...' : 'Yes, Cancel'}
        danger
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />

      {/* ── Reschedule Modal ── */}
      {rescheduleTarget && (
        <div className="modal-overlay" onClick={() => setRescheduleTarget(null)}>
          <div className="modal-box reschedule-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="modal-title">✏️ Reschedule Appointment</h3>
            <p className="modal-message">
              Updating appointment with <strong>{getDoctorName(rescheduleTarget.doctorId)}</strong>.
              Status will reset to <em>pending</em> after rescheduling.
            </p>

            <form onSubmit={handleReschedule} className="reschedule-form">
              <div className="form-group">
                <label className="form-label">New Date <span className="required">*</span></label>
                <input
                  type="date"
                  className="form-input"
                  value={rescheduleForm.date}
                  onChange={(e) => setRescheduleForm((p) => ({ ...p, date: e.target.value }))}
                  min={getMinDate()}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Time <span className="required">*</span></label>
                <div className="time-grid-sm">
                  {TIME_SLOTS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`time-slot ${rescheduleForm.time === t ? 'time-slot-active' : ''}`}
                      onClick={() => setRescheduleForm((p) => ({ ...p, time: t }))}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea
                  className="form-textarea"
                  value={rescheduleForm.reason}
                  onChange={(e) => setRescheduleForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Update reason (optional)"
                  rows={2}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setRescheduleTarget(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={rescheduling}>
                  {rescheduling ? <Spinner size="sm" /> : '✅ Confirm Reschedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
