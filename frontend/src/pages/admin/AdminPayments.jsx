import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { paymentService } from '../../services/paymentService'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import PaymentStatus from '../../components/PaymentStatus'
import ConfirmModal from '../../components/ConfirmModal'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import './AdminPayments.css'

export default function AdminPayments() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const toast = useToast()

  const [payments, setPayments] = useState([])
  const [filteredPayments, setFilteredPayments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [modalAction, setModalAction] = useState(null)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [failureReason, setFailureReason] = useState('')

  // Check admin access
  useEffect(() => {
    if (role !== 'admin') {
      navigate('/patient/payments')
    }
  }, [role, navigate])

  // Fetch all payments
  useEffect(() => {
    const fetchPayments = async () => {
      setIsLoading(true)
      try {
        const data = await paymentService.getAll()
        setPayments(data)
      } catch (err) {
        console.error('Failed to fetch payments:', err)
        toast.error('Failed to load payments')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPayments()
  }, [toast])

  // Filter payments based on status and search query
  useEffect(() => {
    let filtered = payments

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter)
    }

    // Filter by search query (payment ID or transaction ID)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p._id.toLowerCase().includes(query) ||
          (p.transactionId && p.transactionId.toLowerCase().includes(query)) ||
          (p.appointmentId && p.appointmentId.toLowerCase().includes(query))
      )
    }

    setFilteredPayments(filtered)
  }, [payments, statusFilter, searchQuery])

  const handleConfirm = async () => {
    if (!selectedPayment) return

    setIsProcessing(true)
    try {
      const updated = await paymentService.confirm(selectedPayment._id)
      setPayments((prev) =>
        prev.map((p) => (p._id === updated._id ? updated : p))
      )
      toast.success('Payment confirmed successfully!')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to confirm payment'
      toast.error(msg)
    } finally {
      setIsProcessing(false)
      setShowConfirmModal(false)
      setModalAction(null)
      setSelectedPayment(null)
    }
  }

  const handleFail = async () => {
    if (!selectedPayment) return

    setIsProcessing(true)
    try {
      const updated = await paymentService.fail(
        selectedPayment._id,
        failureReason
      )
      setPayments((prev) =>
        prev.map((p) => (p._id === updated._id ? updated : p))
      )
      toast.success('Payment marked as failed')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to process payment failure'
      toast.error(msg)
    } finally {
      setIsProcessing(false)
      setShowConfirmModal(false)
      setModalAction(null)
      setSelectedPayment(null)
      setFailureReason('')
    }
  }

  const openConfirmModal = (payment, action) => {
    setSelectedPayment(payment)
    setModalAction(action)
    setShowConfirmModal(true)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusStats = () => {
    return {
      total: payments.length,
      pending: payments.filter((p) => p.status === 'pending').length,
      confirmed: payments.filter((p) => p.status === 'confirmed').length,
      failed: payments.filter((p) => p.status === 'failed').length,
    }
  }

  const stats = getStatusStats()

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="dashboard-page fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Payment Management</h1>
        <p className="page-subtitle">Review and manage all system payments</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Payments</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{stats.pending}</div>
        </div>
        <div className="stat-card stat-confirmed">
          <div className="stat-label">Confirmed</div>
          <div className="stat-value">{stats.confirmed}</div>
        </div>
        <div className="stat-card stat-failed">
          <div className="stat-label">Failed</div>
          <div className="stat-value">{stats.failed}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="filters-section">
          <div className="filter-group">
            <label className="filter-label">Status</label>
            <div className="filter-buttons">
              {['all', 'pending', 'confirmed', 'failed'].map((status) => (
                <button
                  key={status}
                  className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Search</label>
            <input
              type="text"
              className="search-input"
              placeholder="Search by Payment ID, Transaction ID, or Appointment ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card">
        {filteredPayments.length > 0 ? (
          <div className="payments-table">
            <div className="table-header">
              <div className="col col-id">Payment ID</div>
              <div className="col col-appointment">Appointment</div>
              <div className="col col-amount">Amount</div>
              <div className="col col-status">Status</div>
              <div className="col col-date">Created</div>
              <div className="col col-actions">Actions</div>
            </div>

            <div className="table-body">
              {filteredPayments.map((payment) => (
                <div key={payment._id} className="table-row">
                  <div className="col col-id">
                    <span className="payment-id" title={payment._id}>
                      {payment._id.substring(0, 8)}...
                    </span>
                  </div>
                  <div className="col col-appointment">
                    <span title={payment.appointmentId || 'N/A'}>
                      {payment.appointmentId ? payment.appointmentId.substring(0, 8) + '...' : 'N/A'}
                    </span>
                  </div>
                  <div className="col col-amount">
                    <span className="amount">
                      {payment.currency || 'USD'} {payment.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="col col-status">
                    <PaymentStatus status={payment.status} />
                  </div>
                  <div className="col col-date">
                    <span className="date">{formatDate(payment.createdAt)}</span>
                  </div>
                  <div className="col col-actions">
                    <div className="action-buttons-small">
                      <button
                        className="btn-action btn-view"
                        onClick={() => navigate(`/admin/payments/${payment._id}`)}
                        title="View Details"
                      >
                        👁️
                      </button>
                      {payment.status === 'pending' && (
                        <>
                          <button
                            className="btn-action btn-confirm"
                            onClick={() => openConfirmModal(payment, 'confirm')}
                            title="Confirm Payment"
                            disabled={isProcessing}
                          >
                            ✓
                          </button>
                          <button
                            className="btn-action btn-fail"
                            onClick={() => openConfirmModal(payment, 'fail')}
                            title="Mark as Failed"
                            disabled={isProcessing}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="No Payments Found"
            message="There are no payments matching your filters"
          />
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={showConfirmModal && modalAction === 'confirm'}
        title="Confirm Payment"
        message={
          selectedPayment
            ? `Are you sure you want to confirm this payment of ${selectedPayment.currency || 'USD'} ${selectedPayment.amount.toFixed(2)}?`
            : ''
        }
        onConfirm={handleConfirm}
        onCancel={() => {
          setShowConfirmModal(false)
          setModalAction(null)
          setSelectedPayment(null)
        }}
        confirmLabel="Yes, Confirm"
      />

      {/* Fail Modal */}
      <ConfirmModal
        isOpen={showConfirmModal && modalAction === 'fail'}
        title="Mark Payment as Failed"
        message="Provide a reason for the payment failure."
        onConfirm={handleFail}
        onCancel={() => {
          setShowConfirmModal(false)
          setModalAction(null)
          setSelectedPayment(null)
          setFailureReason('')
        }}
        confirmLabel="Mark as Failed"
        danger
      >
        <div className="modal-content">
          <textarea
            className="modal-textarea"
            placeholder="Enter failure reason (e.g., Insufficient funds, Card declined, etc.)"
            value={failureReason}
            onChange={(e) => setFailureReason(e.target.value)}
            maxLength={500}
          />
          <div className="char-count">
            {failureReason.length}/500
          </div>
        </div>
      </ConfirmModal>
    </div>
  )
}
