import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { telemedicineService } from '../../services/telemedicineService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import './Telemedicine.css'

export default function SessionsListPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const { role } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    telemedicineService.listMine()
      .then(({ data }) => setSessions(data.sessions || []))
      .catch(() => toast.error('Failed to load video sessions.'))
      .finally(() => setLoading(false))
  }, [])

  const joinPath = (sessionId) =>
    role === 'doctor'
      ? `/doctor/consultations/${sessionId}`
      : `/patient/consultations/${sessionId}`

  if (loading) return <Spinner size="lg" text="Loading sessions..." />

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h1 className="page-title">Video Consultations</h1>
        <p className="page-subtitle">Join scheduled sessions or review past ones.</p>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          icon="🎥"
          title="No sessions yet"
          message={role === 'doctor'
            ? 'Video sessions will appear here once you start a consultation from a confirmed appointment.'
            : 'Your upcoming video sessions will appear here after you join one from your appointments.'}
        />
      ) : (
        <div>
          {sessions.map(s => (
            <div key={s._id} className="session-card">
              <div>
                <strong>Room:</strong> <code>{s.roomName}</code>
                <div className="session-meta">
                  {s.scheduledAt ? new Date(s.scheduledAt).toLocaleString() : '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`session-status session-status-${s.status}`}>{s.status.replace('_', ' ')}</span>
                {(s.status === 'scheduled' || s.status === 'in_progress') && (
                  <button className="btn btn-primary" onClick={() => navigate(joinPath(s._id))}>
                    🎥 Join
                  </button>
                )}
                {s.status === 'completed' && (
                  <button className="btn btn-secondary" onClick={() => navigate(joinPath(s._id))}>
                    View
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
