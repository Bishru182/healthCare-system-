import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { paymentService } from '../../services/paymentService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import PaymentStatus from '../../components/PaymentStatus'
import ConfirmModal from '../../components/ConfirmModal'
import Spinner from '../../components/Spinner'
import './PaymentDetails.css'

export default function PaymentDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const toast = useToast()

  const [payment, setPayment] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [modalAction, setModalAction] = useState(null)
  const [failureReason, setFailureReason] = useState('')

  useEffect(() => {
    const fetchPayment = async () => {
      setIsLoading(true)
      try {
        const data = await paymentService.getById(id)
        setPayment(data)
      } catch (err) {
        console.error('Failed to fetch payment:', err)
        toast.error('Failed to load payment details')
        navigate('/patient/payments')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPayment()
  }, [id, navigate, toast])

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      const updated = await paymentService.confirm(payment._id)
      setPayment(updated)
      toast.success('Payment confirmed successfully!')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to confirm payment'
      toast.error(msg)
    } finally {
      setIsProcessing(false)
      setShowConfirmModal(false)
      setModalAction(null)
    }
  }

  const handleFail = async () => {
    setIsProcessing(true)
    try {
      const updated = await paymentService.fail(payment._id, failureReason)
      setPayment(updated)
      toast.success('Payment marked as failed')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to process payment failure'
      toast.error(msg)
    } finally {
      setIsProcessing(false)
      setShowConfirmModal(false)
      setModalAction(null)
      setFailureReason('')
    }
  }

  const openConfirmAction = (action) => {
    setModalAction(action)
    setShowConfirmModal(true)
  }

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <Spinner />
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="dashboard-page">
        <div className="not-found">
          <h2>Payment Not Found</h2>
          <button onClick={() => navigate('/patient/payments')} className="btn btn-primary">
            Back to Payments
          </button>
        </div>
      </div>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="dashboard-page fade-in">
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate('/patient/payments')} className="btn-back">
          ← Back to Payments
        </button>
        <h1 className="page-title">Payment Details</h1>
      </div>

      {/* Main Card */}
      <div className="card payment-details-card">
        {/* Status Section */}
        <div className="details-section details-status">
          <div className="status-display">
            <PaymentStatus status={payment.status} />
            <span className="status-timestamp">{formatDate(payment.createdAt)}</span>
          </div>
        </div>

        {/* Payment Info Grid */}
        <div className="details-section">
          <h2 className="section-title">Payment Information</h2>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Payment ID</span>
              <span className="detail-value font-mono">{payment._id}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Amount</span>
              <span className="detail-value amount">
                {payment.currency || 'USD'} {payment.amount.toFixed(2)}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className="detail-value">
                <PaymentStatus status={payment.status} />
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Payment Method</span>
              <span className="detail-value text-capitalize">
                {payment.paymentMethod || 'Not specified'}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Appointment ID</span>
              <span className="detail-value font-mono">{payment.appointmentId || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Transaction ID</span>
              <span className="detail-value font-mono">
                {payment.transactionId || 'Pending...'}
              </span>
            </div>
          </div>
        </div>

        {/* Failure Reason (if failed) */}
        {payment.status === 'failed' && payment.failureReason && (
          <div className="details-section details-failure">
            <h3 className="section-title">Failure Details</h3>
            <div className="failure-box">
              <span className="failure-icon">⚠️</span>
              <div>
                <div className="failure-label">Reason:</div>
                <div className="failure-text">{payment.failureReason}</div>
              </div>
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="details-section">
          <h3 className="section-title">Timestamps</h3>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Created</span>
              <span className="detail-value">{formatDate(payment.createdAt)}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Updated</span>
              <span className="detail-value">{formatDate(payment.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons - Only for Admins */}
        {payment.status === 'pending' && role === 'admin' && (
          <div className="details-section details-actions">
            <h3 className="section-title">Payment Actions</h3>
            <div className="action-buttons">
              <button
                className="btn btn-primary"
                onClick={() => openConfirmAction('confirm')}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : '✓ Confirm Payment'}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => openConfirmAction('fail')}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : '✕ Mark as Failed'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Modal for Confirm Action */}
      <ConfirmModal
        isOpen={showConfirmModal && modalAction === 'confirm'}
        title="Confirm Payment"
        message={`Are you sure you want to confirm this payment of ${payment.currency || 'USD'} ${payment.amount.toFixed(2)}?`}
        onConfirm={handleConfirm}
        onCancel={() => {
          setShowConfirmModal(false)
          setModalAction(null)
        }}
        confirmLabel="Yes, Confirm"
      />

      {/* Confirm Modal for Fail Action */}
      <ConfirmModal
        isOpen={showConfirmModal && modalAction === 'fail'}
        title="Mark Payment as Failed"
        message="Optionally provide a reason for the payment failure."
        onConfirm={handleFail}
        onCancel={() => {
          setShowConfirmModal(false)
          setModalAction(null)
          setFailureReason('')
        }}
        confirmLabel="Mark as Failed"
        danger
      >
        <div className="modal-extra-content">
          <textarea
            className="form-input"
            placeholder="Enter reason (optional)..."
            value={failureReason}
            onChange={(e) => setFailureReason(e.target.value)}
            rows="3"
          />
        </div>
      </ConfirmModal>
    </div>
  )
}
