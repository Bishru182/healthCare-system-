import { useState } from 'react'
import './PaymentForm.css'

export default function PaymentForm({ onSubmit, isLoading = false, appointments = [] }) {
  const [appointmentId, setAppointmentId] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [paymentMethod, setPaymentMethod] = useState('credit_card')
  const [errors, setErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate
    const newErrors = {}
    if (!appointmentId) newErrors.appointmentId = 'Please select an appointment'
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Please enter a valid amount'
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await onSubmit({
        appointmentId,
        amount: parseFloat(amount),
        currency,
        paymentMethod,
      })
      
      // Reset form
      setAppointmentId('')
      setAmount('')
      setCurrency('USD')
      setPaymentMethod('credit_card')
      setErrors({})
    } catch (err) {
      console.error('Payment form error:', err)
    }
  }

  const pendingAppointments = appointments.filter(
    (apt) => apt.status === 'confirmed' || apt.status === 'pending'
  )

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      {/* Appointment Selection */}
      <div className="form-group">
        <label htmlFor="appointment-select" className="form-label">
          Select Appointment *
        </label>
        <select
          id="appointment-select"
          className={`form-select ${errors.appointmentId ? 'has-error' : ''}`}
          value={appointmentId}
          onChange={(e) => {
            setAppointmentId(e.target.value)
            setErrors((prev) => ({ ...prev, appointmentId: '' }))
          }}
          disabled={isLoading}
        >
          <option value="">Choose an appointment...</option>
          {pendingAppointments.length > 0 ? (
            pendingAppointments.map((apt) => (
              <option key={apt._id} value={apt._id}>
                Doctor {apt.doctorId ? apt.doctorId.slice(-4) : '?'} - {new Date(apt.date).toLocaleDateString()} at {apt.time}
              </option>
            ))
          ) : (
            <option disabled>No pending appointments available</option>
          )}
        </select>
        {errors.appointmentId && (
          <span className="form-error">{errors.appointmentId}</span>
        )}
      </div>

      {/* Amount */}
      <div className="form-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="amount-input" className="form-label">
            Amount *
          </label>
          <input
            id="amount-input"
            type="number"
            step="0.01"
            min="0"
            className={`form-input ${errors.amount ? 'has-error' : ''}`}
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setErrors((prev) => ({ ...prev, amount: '' }))
            }}
            disabled={isLoading}
          />
          {errors.amount && (
            <span className="form-error">{errors.amount}</span>
          )}
        </div>

        {/* Currency */}
        <div className="form-group" style={{ flex: 0.5 }}>
          <label htmlFor="currency-select" className="form-label">
            Currency
          </label>
          <select
            id="currency-select"
            className="form-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={isLoading}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
          </select>
        </div>
      </div>

      {/* Payment Method */}
      <div className="form-group">
        <label htmlFor="method-select" className="form-label">
          Payment Method
        </label>
        <select
          id="method-select"
          className="form-select"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          disabled={isLoading}
        >
          <option value="credit_card">Credit Card</option>
          <option value="debit_card">Debit Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="digital_wallet">Digital Wallet</option>
        </select>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="btn btn-primary btn-lg"
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Proceed to Payment'}
      </button>
    </form>
  )
}
