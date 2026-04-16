import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { telemedicineService } from '../../services/telemedicineService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import './Telemedicine.css'

/**
 * Dynamically injects the Jitsi Meet external API script.
 */
function loadJitsiApi(domain) {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve(window.JitsiMeetExternalAPI)
    const script = document.createElement('script')
    script.src = `https://${domain}/external_api.js`
    script.async = true
    script.onload = () => resolve(window.JitsiMeetExternalAPI)
    script.onerror = () => reject(new Error('Failed to load Jitsi API'))
    document.body.appendChild(script)
  })
}

export default function VideoRoomPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [joinInfo, setJoinInfo] = useState(null)
  const [ending, setEnding] = useState(false)
  const [notes, setNotes] = useState('')
  const containerRef = useRef(null)
  const apiRef = useRef(null)

  useEffect(() => {
    const init = async () => {
      try {
        const [sessionRes, joinRes] = await Promise.all([
          telemedicineService.getById(id),
          telemedicineService.getJoinInfo(id),
        ])
        setSession(sessionRes.data.session)
        setJoinInfo(joinRes.data.joinInfo)

        // Mark session as started (idempotent on backend)
        try { await telemedicineService.start(id) } catch (_) {}
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not load session.')
        navigate(role === 'doctor' ? '/doctor/consultations' : '/patient/consultations')
      } finally {
        setLoading(false)
      }
    }
    init()
    return () => {
      if (apiRef.current) {
        try { apiRef.current.dispose() } catch {}
        apiRef.current = null
      }
    }
  }, [id])

  useEffect(() => {
    if (!joinInfo || !containerRef.current) return
    let disposed = false

    const start = async () => {
      try {
        const JitsiMeetExternalAPI = await loadJitsiApi(joinInfo.domain)
        if (disposed) return
        // Clean previous
        if (apiRef.current) { try { apiRef.current.dispose() } catch {} }
        const api = new JitsiMeetExternalAPI(joinInfo.domain, {
          roomName: joinInfo.roomName,
          parentNode: containerRef.current,
          width: '100%',
          height: '100%',
          userInfo: {
            displayName:
              (role === 'doctor' ? 'Dr. ' : '') +
              (user?.name || joinInfo.displayName || 'Guest'),
          },
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'desktop', 'fullscreen', 'hangup',
              'chat', 'settings', 'raisehand', 'tileview',
            ],
          },
        })
        apiRef.current = api

        api.addListener('readyToClose', () => {
          if (role === 'doctor') {
            // Show notes modal on doctor leave
            toast.info('Session ended. Add any consultation notes and save.')
          } else {
            navigate('/patient/consultations')
          }
        })
      } catch {
        toast.error('Could not initialize video. Check your network.')
      }
    }
    start()
    return () => { disposed = true }
  }, [joinInfo])

  const handleEnd = async () => {
    setEnding(true)
    try {
      await telemedicineService.end(id, notes)
      if (apiRef.current) { try { apiRef.current.executeCommand('hangup') } catch {} }
      toast.success('Session completed.')
      navigate(role === 'doctor' ? '/doctor/consultations' : '/patient/consultations')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end session.')
    } finally {
      setEnding(false)
    }
  }

  if (loading) return <Spinner size="lg" text="Connecting to session..." />

  return (
    <div className="video-room fade-in">
      <div className="video-room-header">
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>🎥 Video Consultation</h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            Room: <code>{joinInfo?.roomName}</code>
            {' · '}<span className="badge badge-confirmed">{session?.status || 'in_progress'}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
          <button className="btn btn-danger" onClick={handleEnd} disabled={ending}>
            {ending ? <Spinner size="sm" /> : '⏹ End Session'}
          </button>
        </div>
      </div>

      <div className="jitsi-frame" ref={containerRef} />

      {role === 'doctor' && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header"><h2 className="card-title">📝 Consultation Notes</h2></div>
          <div className="card-body">
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Record observations, recommendations, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <small style={{ color: '#64748b' }}>
              Notes are saved when you click "End Session" above.
            </small>
          </div>
        </div>
      )}
    </div>
  )
}
