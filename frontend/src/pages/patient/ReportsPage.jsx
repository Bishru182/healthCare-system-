import { useState, useEffect, useRef } from 'react'
import { patientService } from '../../services/patientService'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import ConfirmModal from '../../components/ConfirmModal'
import './PatientDashboard.css'
import './Reports.css'

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const fileRef = useRef(null)
  const toast = useToast()

  useEffect(() => { fetchReports() }, [])

  const fetchReports = async () => {
    try {
      const { data } = await patientService.getReports()
      setReports(data.reports || [])
    } catch {
      toast.error('Failed to load reports.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    const file = fileRef.current?.files[0]
    if (!file) { toast.error('Please select a file to upload.'); return }

    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    try {
      await patientService.uploadReport(formData)
      toast.success('Report uploaded successfully!')
      fileRef.current.value = ''
      fetchReports()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    try {
      await patientService.deleteReport(deleteTarget)
      setReports((prev) => prev.filter((r) => r._id !== deleteTarget))
      toast.success('Report deleted.')
    } catch {
      toast.error('Failed to delete report.')
    } finally {
      setDeleteTarget(null)
    }
  }

  const getFileIcon = (url = '') => {
    if (url.includes('.pdf') || url.toLowerCase().includes('pdf')) return '📄'
    if (/\.(png|jpg|jpeg|gif|webp)/i.test(url)) return '🖼️'
    return '📎'
  }

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h1 className="page-title">Medical Reports</h1>
        <p className="page-subtitle">Upload and manage your medical documents securely.</p>
      </div>

      {/* Upload Card */}
      <div className="card" style={{ maxWidth: 600, marginBottom: 28 }}>
        <div className="card-header">
          <h2 className="card-title">📤 Upload New Report</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleUpload} className="upload-form">
            <div className="upload-zone" onClick={() => fileRef.current?.click()}>
              <span className="upload-zone-icon">☁️</span>
              <p className="upload-zone-text">Click to select a file or drag & drop</p>
              <p className="upload-zone-hint">PDF, JPEG, PNG up to 10MB</p>
              <input
                ref={fileRef}
                type="file"
                id="report-file-input"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                style={{ display: 'none' }}
                onChange={() => {
                  const name = fileRef.current?.files[0]?.name
                  if (name) toast.info(`Selected: ${name}`)
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? <Spinner size="sm" /> : '⬆️ Upload Report'}
            </button>
          </form>
        </div>
      </div>

      {/* Reports List */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📋 My Reports</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {reports.length} report{reports.length !== 1 ? 's' : ''}
          </span>
        </div>
        {loading ? (
          <Spinner size="lg" text="Loading reports..." />
        ) : reports.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No reports uploaded"
            description="Upload your first medical report using the form above."
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Uploaded</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.4rem' }}>{getFileIcon(r.fileUrl)}</span>
                        <a href={r.fileUrl} target="_blank" rel="noreferrer" className="report-link">
                          {r.publicId || 'View Report'}
                        </a>
                      </div>
                    </td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <a href={r.fileUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                          View
                        </a>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(r._id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Report"
        message="Are you sure you want to permanently delete this report? This action cannot be undone."
        confirmLabel="Delete Report"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
