# Healthcare System - Payment Service Frontend

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Running backend services (Patient, Appointment, Payment on ports 3002, 3001, 3003)
- MongoDB Atlas connection

### Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`

---

## 📁 Project Structure

```
frontend/src/
├── services/
│   ├── api.js                    # Axios instances for all services
│   ├── paymentService.js         # Payment API client
│   ├── appointmentService.js     # Appointment API client
│   └── patientService.js         # Patient API client
│
├── components/
│   ├── PaymentStatus.jsx         # Status badge (pending/completed/failed)
│   ├── PaymentList.jsx           # Payment table display
│   ├── PaymentForm.jsx           # Create payment form
│   └── ConfirmModal.jsx          # Confirmation dialogs
│
├── pages/patient/
│   ├── PaymentHistoryPage.jsx    # /patient/payments (main dashboard)
│   ├── MakePaymentPage.jsx       # /patient/payments/make (create)
│   └── PaymentDetailsPage.jsx    # /patient/payments/:id (view/edit)
│
├── context/
│   ├── AuthContext.jsx           # Auth state (user, token, login/logout)
│   └── ToastContext.jsx          # Toast notifications
│
├── App.jsx                       # Main router
└── main.jsx                      # Entry point
```

---

## 🎯 Key Features

### Payment Pages
| Route | Purpose | Features |
|-------|---------|----------|
| `/patient/payments` | Payment History | View stats, filter by status, create new |
| `/patient/payments/make` | Create Payment | Form with appointment selection & validation |
| `/patient/payments/:id` | Payment Details | View full info, confirm/fail payment |

### Components
- **PaymentStatus**: Color-coded badge (pending=amber, completed=green, failed=red)
- **PaymentList**: Responsive table with date/amount formatting
- **PaymentForm**: Validates amount, handles appointment selection, currency/method dropdowns
- **PaymentHistory/Make/Details Pages**: Full-featured payment management

---

## 📡 API Endpoints

### Payment Service (Port 3003)
```javascript
// Create payment
POST /api/payments/create
{
  appointmentId: "ObjectId",
  amount: 100,
  currency: "USD",
  paymentMethod: "credit_card|debit_card|bank_transfer|digital_wallet"
}

// Get patient payments
GET /api/payments/patient/:patientId

// Get single payment
GET /api/payments/:paymentId

// Confirm payment
POST /api/payments/confirm
{ paymentId: "ObjectId" }

// Fail payment
POST /api/payments/fail
{ paymentId: "ObjectId", reason: "optional reason" }
```

### Appointment Service (Port 3001)
```javascript
// Get patient appointments
GET /api/appointments/patient/:patientId
```

---

## 🔐 Authentication

- JWT token stored in `localStorage` as `medico_token`
- Auto-attached to all requests via Axios interceptor
- 401 responses auto-logout user
- Login/signup on `/login` and `/signup`

---

## 🎨 Styling

Uses CSS variables for theming:
```css
--primary: #3b82f6
--success: #10b981
--warning: #f59e0b
--danger: #ef4444
--text: #1f2937
--bg: #ffffff
```

All pages are **mobile-responsive** with breakpoints at 768px and 480px.

---

## 🛠️ Common Tasks

### Add Payment to Sidebar
In `DashboardLayout.jsx`:
```javascript
const navItems = [
  // ... existing items
  { to: '/patient/payments', label: 'Payments', icon: '💳' },
]
```

### Add Payment Route
In `App.jsx`:
```javascript
import PaymentHistory from './pages/patient/PaymentHistory'
import MakePayment from './pages/patient/MakePayment'
import PaymentDetails from './pages/patient/PaymentDetails'

<Route path="/patient/payments" element={<PaymentHistory />} />
<Route path="/patient/payments/make" element={<MakePayment />} />
<Route path="/patient/payments/:id" element={<PaymentDetails />} />
```

### Fetch Payments
```javascript
import { paymentService } from '@/services/paymentService'

// Get all payments for patient
const payments = await paymentService.getByPatient(patientId)

// Get single payment
const payment = await paymentService.getById(paymentId)

// Create payment
const payment = await paymentService.create(
  appointmentId,
  amount,
  currency,
  paymentMethod
)

// Confirm payment
const updated = await paymentService.confirm(paymentId)

// Fail payment
const updated = await paymentService.fail(paymentId, reason)
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS error on payment fetch | Ensure payment service running on 3003 with CORS enabled |
| 400 Bad Request on create | Check `paymentMethod` is one of: credit_card, debit_card, bank_transfer, digital_wallet |
| Appointments empty in dropdown | Ensure appointment service running (port 3001) and patient has appointments |
| 401 Unauthorized | Token expired or invalid - re-login |
| Form stays loading | Check browser console for API errors |

---

## 📊 Files Created/Modified

**New Files (17):**
- Services: paymentService.js
- Components: PaymentStatus, PaymentList, PaymentForm (3 JSX + 3 CSS)
- Pages: PaymentHistory, MakePayment, PaymentDetails (3 JSX + 3 CSS)

**Modified Files (2):**
- api.js - Added paymentApi
- ConfirmModal.jsx - Added children support
- App.jsx - Added payment routes
- DashboardLayout.jsx - Added Payments nav item

---

## 🚀 Deployment

When deploying, update API endpoints in `src/services/api.js`:
```javascript
// Production
export const paymentApi = attachToken(
  axios.create({ baseURL: 'https://api.yourdomain.com/api/payments' })
)
```

---

## 📝 Notes

- All payment amounts in USD (or as configured)
- Pending payments can be confirmed or failed
- Completed/failed payments are read-only
- Payment history sorted by date (newest first)
- All operations require valid JWT authentication
