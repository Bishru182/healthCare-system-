import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { paymentService } from '../../services/paymentService'
import { appointmentService } from '../../services/appointmentService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import PaymentForm from '../../components/PaymentForm'
import Spinner from '../../components/Spinner'
import './MakePayment.css'

export default function MakePaymentPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const patientId = user?._id || user?.id

  const [appointments, setAppointments] = useState([])
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [isProcessingOnline, setIsProcessingOnline] = useState(false)
  const [onlineAppointmentId, setOnlineAppointmentId] = useState('')
  const [createdPayment, setCreatedPayment] = useState(null)

  useEffect(() => {
    if (!patientId) {
      setIsLoadingAppointments(false)
      return
    }

    const fetchAppointments = async () => {
      setIsLoadingAppointments(true)
      try {
        const data = await appointmentService.getByPatient(patientId)
        setAppointments(data || [])
      } catch (err) {
        console.error('Failed to fetch appointments:', err)
        toast.error('Failed to load appointments')
      } finally {
        setIsLoadingAppointments(false)
      }
    }

    fetchAppointments()
  }, [patientId, toast])

  const handlePaymentSubmit = async (formData) => {
    setIsProcessingPayment(true)
    try {
      const payment = await paymentService.create(
        formData.appointmentId,
        formData.amount,
        formData.currency,
        formData.paymentMethod
      )
      
      setCreatedPayment(payment)
      toast.success('Payment created successfully! Status: Pending')
      
      // Redirect to payment details after a brief delay
      setTimeout(() => {
        navigate(`/patient/payments/${payment._id}`)
      }, 1500)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create payment'
      toast.error(msg)
    } finally {
      setIsProcessingPayment(false)
    }
  }

  const onlineEligibleAppointments = appointments.filter(
    (apt) => apt.status === 'confirmed' || apt.status === 'pending'
  )

  const handleOnlineCheckout = async () => {
    if (!onlineAppointmentId) {
      toast.error('Please select an appointment for online checkout')
      return
    }

    setIsProcessingOnline(true)
    try {
      const result = await paymentService.initiateOnline(onlineAppointmentId, 'STRIPE')

      if (result?.redirectUrl) {
        toast.info('Redirecting to Stripe checkout...')
        window.location.assign(result.redirectUrl)
        return
      }

      toast.warning('Online payment initialized without redirect URL. Opening payment details.')
      if (result?.paymentId) {
        navigate(`/patient/payments/${result.paymentId}`)
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to initiate online payment'
      toast.error(msg)
    } finally {
      setIsProcessingOnline(false)
    }
  }

  return (
    <div className="dashboard-page fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Make a Payment</h1>
        <p className="page-subtitle">
          Create a new payment for your appointment. Fill in the details below.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="make-payment-layout">
        {/* Form Section */}
        <div className="payment-form-section">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">💳 Payment Details</h2>
            </div>
            <div className="card-body">
              {isLoadingAppointments ? (
                <div className="loading-placeholder">
                  <Spinner />
                </div>
              ) : (
                <>
                  <PaymentForm
                    onSubmit={handlePaymentSubmit}
                    isLoading={isProcessingPayment}
                    appointments={appointments}
                  />

                  <div className="online-checkout-divider">
                    <span>OR</span>
                  </div>

                  <div className="online-checkout-box">
                    <h3 className="online-checkout-title">Pay Online with Stripe</h3>
                    <p className="online-checkout-text">
                      Start secure gateway checkout and complete payment in your browser.
                    </p>

                    <div className="form-group">
                      <label htmlFor="online-appointment-select" className="form-label">
                        Appointment for Online Checkout
                      </label>
                      <select
                        id="online-appointment-select"
                        className="form-select"
                        value={onlineAppointmentId}
                        onChange={(e) => setOnlineAppointmentId(e.target.value)}
                        disabled={isProcessingOnline}
                      >
                        <option value="">Choose an appointment...</option>
                        {onlineEligibleAppointments.length > 0 ? (
                          onlineEligibleAppointments.map((apt) => (
                            <option key={apt._id} value={apt._id}>
                              Doctor {apt.doctorId ? apt.doctorId.slice(-4) : '?'} - {new Date(apt.date).toLocaleDateString()} at {apt.time}
                            </option>
                          ))
                        ) : (
                          <option disabled>No pending appointments available</option>
                        )}
                      </select>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-lg online-checkout-btn"
                      onClick={handleOnlineCheckout}
                      disabled={isProcessingOnline}
                    >
                      {isProcessingOnline ? 'Redirecting...' : 'Proceed to Stripe Checkout'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="payment-info-section">
          {/* Payment Info Card */}
          <div className="card info-card">
            <div className="card-header">
              <h3 className="card-title">📋 About Payments</h3>
            </div>
            <div className="card-body">
              <div className="info-item">
                <div className="info-icon">✓</div>
                <div className="info-text">
                  <div className="info-title">Secure Transactions</div>
                  <div className="info-desc">Your payment data is encrypted and secure</div>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">💳</div>
                <div className="info-text">
                  <div className="info-title">Multiple Methods</div>
                  <div className="info-desc">Pay with card, bank transfer, or digital wallet</div>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">⏱️</div>
                <div className="info-text">
                  <div className="info-title">Instant Confirmation</div>
                  <div className="info-desc">Get payment status immediately</div>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">📱</div>
                <div className="info-text">
                  <div className="info-title">Track Anytime</div>
                  <div className="info-desc">View payment history and details anytime</div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Card */}
          <div className="card faq-card">
            <div className="card-header">
              <h3 className="card-title">❓ Common Questions</h3>
            </div>
            <div className="card-body">
              <div className="faq-item">
                <div className="faq-question">Can I pay later?</div>
                <div className="faq-answer">
                  Yes, you can create a payment and confirm it later.
                </div>
              </div>
              <div className="faq-item">
                <div className="faq-question">What if payment fails?</div>
                <div className="faq-answer">
                  You'll receive a notification and can try again with a different method.
                </div>
              </div>
              <div className="faq-item">
                <div className="faq-question">Is a receipt issued?</div>
                <div className="faq-answer">
                  Yes, check your email or view it in your payment history.
                </div>
              </div>
            </div>
          </div>

          {/* Pending Appointments */}
          {appointments.length > 0 && (
            <div className="card appointments-card">
              <div className="card-header">
                <h3 className="card-title">📅 Your Appointments</h3>
              </div>
              <div className="card-body">
                <div className="appointments-list">
                  {appointments
                    .filter((apt) => apt.status === 'confirmed' || apt.status === 'pending')
                    .map((apt) => (
                      <div key={apt._id} className="appointment-item">
                        <div className="apt-date">
                          {new Date(apt.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="apt-info">
                          <div className="apt-doctor">Doctor {apt.doctorId ? apt.doctorId.slice(-4) : '?'}</div>
                          <div className="apt-time">{apt.time}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
