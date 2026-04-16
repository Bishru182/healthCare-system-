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
  const [showLocalPreview, setShowLocalPreview] = useState(false)
  const [jitsiReady, setJitsiReady] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinRequested, setJoinRequested] = useState(false)
  const [videoError, setVideoError] = useState('')
  const [mediaError, setMediaError] = useState('')
  const [mediaReady, setMediaReady] = useState(false)
  const [checkingMedia, setCheckingMedia] = useState(false)
  const [micTesting, setMicTesting] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [videoDevices, setVideoDevices] = useState([])
  const [audioDevices, setAudioDevices] = useState([])
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('')
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('')
  const containerRef = useRef(null)
  const apiRef = useRef(null)
  const localVideoRef = useRef(null)
  const localStreamRef = useRef(null)
  const audioContextRef = useRef(null)
  const audioMeterFrameRef = useRef(null)

  const stopAudioMeter = () => {
    if (audioMeterFrameRef.current) {
      cancelAnimationFrame(audioMeterFrameRef.current)
      audioMeterFrameRef.current = null
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close() } catch {}
      audioContextRef.current = null
    }
    setAudioLevel(0)
  }

  const stopLocalPreview = () => {
    stopAudioMeter()
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    setShowLocalPreview(false)
    setMediaReady(false)
    setMicTesting(false)
  }

  const refreshMediaDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter((d) => d.kind === 'videoinput')
      const microphones = devices.filter((d) => d.kind === 'audioinput')
      setVideoDevices(cameras)
      setAudioDevices(microphones)

      setSelectedVideoDevice((prev) => {
        if (!cameras.length) return ''
        if (prev && cameras.some((d) => d.deviceId === prev)) return prev
        return cameras[0].deviceId
      })

      setSelectedAudioDevice((prev) => {
        if (!microphones.length) return ''
        if (prev && microphones.some((d) => d.deviceId === prev)) return prev
        return microphones[0].deviceId
      })
    } catch {
      // Keep selectors empty when the browser blocks device enumeration.
    }
  }

  const startAudioMeter = async (stream) => {
    stopAudioMeter()
    const audioTracks = stream.getAudioTracks()
    if (!audioTracks.length) {
      setMediaError('No microphone track available. Check your selected microphone.')
      return false
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) {
      setMediaError('Audio meter is not supported in this browser.')
      return false
    }

    const context = new AudioContextClass()
    try { await context.resume() } catch {}
    const analyser = context.createAnalyser()
    analyser.fftSize = 2048
    const source = context.createMediaStreamSource(new MediaStream(audioTracks))
    source.connect(analyser)
    audioContextRef.current = context

    const data = new Uint8Array(analyser.fftSize)
    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i += 1) {
        const normalized = (data[i] - 128) / 128
        sum += normalized * normalized
      }
      const rms = Math.sqrt(sum / data.length)
      setAudioLevel(Math.min(100, Math.round(rms * 260)))
      audioMeterFrameRef.current = requestAnimationFrame(tick)
    }
    tick()
    return true
  }

  const startLocalPreview = async (cameraDeviceId = selectedVideoDevice, audioDeviceId = selectedAudioDevice) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError('Camera API is not available in this browser.')
      return false
    }

    try {
      setCheckingMedia(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraDeviceId ? { deviceId: { exact: cameraDeviceId } } : true,
        audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      })
      stopLocalPreview()
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        try { await localVideoRef.current.play() } catch {}
      }
      setMediaReady(true)
      setMediaError('')
      setShowLocalPreview(true)
      await refreshMediaDevices()
      return true
    } catch (err) {
      const name = err?.name
      let message = 'Could not access your camera/microphone. Check browser permissions and retry.'
      if (name === 'NotAllowedError') {
        message = 'Camera or microphone permission was denied. Allow media access in browser settings.'
      } else if (name === 'NotFoundError') {
        message = 'No camera or microphone device was found. Connect devices and try again.'
      } else if (name === 'NotReadableError') {
        message = 'Camera or microphone is in use by another app. Close that app and retry.'
      } else if (name === 'OverconstrainedError') {
        message = 'The selected camera or microphone is unavailable. Choose a different device.'
      }
      setMediaReady(false)
      setMediaError(message)
      return false
    } finally {
      setCheckingMedia(false)
    }
  }

  const applySelectedDevicesToJitsi = () => {
    if (!apiRef.current) return
    if (selectedVideoDevice) {
      try { apiRef.current.executeCommand('setVideoInputDevice', selectedVideoDevice) } catch {}
    }
    if (selectedAudioDevice) {
      try { apiRef.current.executeCommand('setAudioInputDevice', selectedAudioDevice) } catch {}
    }
  }

  useEffect(() => {
    let disposed = false
    const mediaDevices = navigator.mediaDevices
    const bootstrap = async () => {
      await refreshMediaDevices()
    }
    bootstrap()

    if (!mediaDevices?.addEventListener) return () => { disposed = true }
    const handleDeviceChange = async () => {
      if (disposed) return
      await refreshMediaDevices()
    }
    mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => {
      disposed = true
      mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [])

  useEffect(() => {
    if (!showLocalPreview || !localVideoRef.current || !localStreamRef.current) return
    localVideoRef.current.srcObject = localStreamRef.current
  }, [showLocalPreview])

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
      setJoinRequested(false)
      setJoining(false)
      if (apiRef.current) {
        try { apiRef.current.dispose() } catch {}
        apiRef.current = null
      }
      setJitsiReady(false)
      stopLocalPreview()
    }
  }, [id])

  useEffect(() => {
    if (!joinRequested || !joinInfo || !containerRef.current) return
    let disposed = false

    const start = async () => {
      try {
        setVideoError('')
        setJitsiReady(false)
        setJoining(true)
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
            prejoinPageEnabled: true,
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
        setJitsiReady(true)
        applySelectedDevicesToJitsi()

        api.addListener('readyToClose', () => {
          if (role === 'doctor') {
            // Show notes modal on doctor leave
            toast.info('Session ended. Add any consultation notes and save.')
          } else {
            navigate('/patient/consultations')
          }
        })

        api.addListener('cameraError', async () => {
          setVideoError('Jitsi could not access your camera. Opening local camera preview...')
          await startLocalPreview()
        })

        api.addListener('videoConferenceJoined', () => {
          applySelectedDevicesToJitsi()
        })
      } catch {
        setJitsiReady(false)
        setJoinRequested(false)
        setVideoError('Could not initialize Jitsi video. Opening local camera preview...')
        const opened = await startLocalPreview()
        if (!opened) {
          toast.error('Could not initialize video and camera preview. Check permissions/network.')
        }
      } finally {
        if (!disposed) setJoining(false)
      }
    }
    start()
    return () => {
      disposed = true
      setJitsiReady(false)
    }
  }, [joinInfo, joinRequested, navigate, role, user?.name])

  useEffect(() => {
    if (!jitsiReady) return
    applySelectedDevicesToJitsi()
  }, [jitsiReady, selectedVideoDevice, selectedAudioDevice])

  const handleCheckMedia = async () => {
    const opened = await startLocalPreview()
    if (opened) {
      toast.success('Camera and microphone are available.')
    } else {
      toast.error('Could not connect camera/microphone. Check permissions.')
    }
  }

  const handleToggleMicTest = async () => {
    if (!localStreamRef.current) {
      const opened = await startLocalPreview()
      if (!opened) {
        toast.error('Run media check first to test microphone.')
        return
      }
    }

    if (micTesting) {
      setMicTesting(false)
      stopAudioMeter()
      return
    }

    const started = await startAudioMeter(localStreamRef.current)
    if (started) {
      setMicTesting(true)
      setMediaError('')
      toast.info('Microphone test started.')
    } else {
      toast.error('Could not start microphone test.')
    }
  }

  const handleApplyDevices = async () => {
    const wasMicTesting = micTesting
    const opened = await startLocalPreview(selectedVideoDevice, selectedAudioDevice)
    if (opened) {
      applySelectedDevicesToJitsi()
      if (wasMicTesting) {
        const restarted = await startAudioMeter(localStreamRef.current)
        setMicTesting(restarted)
      }
      toast.success('Selected camera and microphone applied.')
    } else {
      toast.error('Could not apply selected devices. Choose another camera/microphone.')
    }
  }

  const handleJoinCall = async () => {
    if (!mediaReady) {
      const opened = await startLocalPreview(selectedVideoDevice, selectedAudioDevice)
      if (!opened) {
        toast.error('Camera and microphone must be available before joining.')
        return
      }
    }
    setJoinRequested(true)
  }

  const handleEnableCamera = async () => {
    await handleCheckMedia()
  }

  const handleEnd = async () => {
    setEnding(true)
    try {
      await telemedicineService.end(id, notes)
      if (apiRef.current) { try { apiRef.current.executeCommand('hangup') } catch {} }
      setJoinRequested(false)
      stopLocalPreview()
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
          <button className="btn btn-secondary" onClick={handleEnableCamera}>Enable Camera</button>
          <button className="btn btn-danger" onClick={handleEnd} disabled={ending}>
            {ending ? <Spinner size="sm" /> : '⏹ End Session'}
          </button>
        </div>
      </div>

      <div className="card media-tools" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <h2 className="card-title">Media Check</h2>
        </div>
        <div className="card-body">
          <div className="media-select-grid">
            <label className="media-field">
              <span>Camera Device</span>
              <select
                className="form-select"
                value={selectedVideoDevice}
                onChange={(e) => setSelectedVideoDevice(e.target.value)}
                data-testid="camera-select"
              >
                {videoDevices.map((device, index) => (
                  <option key={device.deviceId || `video-${index}`} value={device.deviceId}>
                    {device.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="media-field">
              <span>Microphone Device</span>
              <select
                className="form-select"
                value={selectedAudioDevice}
                onChange={(e) => setSelectedAudioDevice(e.target.value)}
                data-testid="mic-select"
              >
                {audioDevices.map((device, index) => (
                  <option key={device.deviceId || `audio-${index}`} value={device.deviceId}>
                    {device.label || `Microphone ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="media-actions">
            <button className="btn btn-secondary" onClick={handleCheckMedia} disabled={checkingMedia}>
              {checkingMedia ? <Spinner size="sm" /> : 'Check Camera & Mic'}
            </button>
            <button className="btn btn-secondary" onClick={handleToggleMicTest}>
              {micTesting ? 'Stop Mic Test' : 'Start Mic Test'}
            </button>
            <button className="btn btn-secondary" onClick={handleApplyDevices} disabled={checkingMedia}>
              Apply Devices
            </button>
            <button
              className="btn btn-primary"
              onClick={handleJoinCall}
              disabled={joining || checkingMedia || !mediaReady}
            >
              {joining ? <Spinner size="sm" /> : (jitsiReady ? 'Rejoin Call' : 'Join Call')}
            </button>
          </div>

          <div className="media-status-row">
            <span
              className={`media-status-pill ${mediaReady ? 'media-ready' : 'media-not-ready'}`}
              data-testid="media-status"
            >
              {mediaReady ? 'Camera & mic ready' : 'Camera and microphone not ready'}
            </span>
            <span className="media-level-text" data-testid="mic-level-text">
              {micTesting ? `Mic input level: ${audioLevel}%` : 'Start mic test to measure input level.'}
            </span>
          </div>

          <div className="volume-meter" aria-label="Microphone volume meter">
            <div
              className={`volume-meter-fill ${micTesting ? 'is-active' : ''}`}
              style={{ width: `${audioLevel}%` }}
              data-testid="volume-meter-fill"
            />
          </div>
        </div>
      </div>

      <div className={`video-stage ${showLocalPreview && !jitsiReady ? 'video-stage-fallback' : ''}`}>
        <div className="jitsi-frame" ref={containerRef} />
        {showLocalPreview && (
          <div className={`local-preview ${!jitsiReady ? 'local-preview-full' : ''}`}>
            <video ref={localVideoRef} autoPlay muted playsInline />
            <span className="local-preview-label">Your camera</span>
          </div>
        )}
      </div>

      {(videoError || mediaError) && (
        <div className="video-room-alert" role="alert">
          {videoError || mediaError}
        </div>
      )}

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
