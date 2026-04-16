# ⚡ Quick Start: Login as Admin

## TL;DR - Create Admin in 30 Seconds

1. **Run this command from the project root:**
   ```bash
   node create-admin.js
   ```

2. **See the success message with credentials:**
   ```
   ✅ Admin account created successfully!
      Email: admin@medico.local
      Password: admin123456
   ```

3. **Login in your browser:**
   - Go to: http://localhost:5173/login
   - Select role: **Admin** (now enabled)
   - Email: `admin@medico.local`
   - Password: `admin123456`
   - Click Sign In

4. **You're now in the Admin Dashboard** 🎉

---

## What Changed?

### ✅ Enabled Admin Role
- Patient model now has `role` field
- Login response includes user role
- Frontend accepts admin selection

### ✅ Created Admin Pages
- `/admin/payments` - Manage all payments
- `/admin/payments/:id` - Payment details

### ✅ Updated Authentication
- Login redirects based on role
- Patient → `/patient/dashboard`
- Admin → `/admin/payments`

---

## Customize Admin Credentials

**Before running the script:**

```bash
# Windows PowerShell
$env:ADMIN_EMAIL="myemail@company.com"
$env:ADMIN_PASSWORD="MySecurePass123!"
$env:ADMIN_NAME="John Admin"
node create-admin.js
```

```bash
# Linux/Mac
export ADMIN_EMAIL="myemail@company.com"
export ADMIN_PASSWORD="MySecurePass123!"
export ADMIN_NAME="John Admin"
node create-admin.js
```

---

## Files Created/Modified

**New Files:**
- `create-admin.js` - Script to create admin user
- `ADMIN_SETUP_GUIDE.md` - Detailed setup guide

**Modified Files:**
- `patient-service/models/Patient.js` - Added role field
- `patient-service/controllers/authController.js` - Return role in response
- `frontend/src/pages/auth/LoginPage.jsx` - Enable admin login

---

## Ready?

👉 **Run:** `node create-admin.js`

Then login at http://localhost:5173 with the credentials shown!

For detailed guide → See `ADMIN_SETUP_GUIDE.md`
