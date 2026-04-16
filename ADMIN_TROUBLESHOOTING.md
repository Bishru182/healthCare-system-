# 🔧 Admin Login Troubleshooting Guide

## Problem: Can't Login as Admin

Follow this step-by-step guide to fix the issue.

---

## Step 1: Run the Setup Script

The **new** and more reliable script is `setup-admin.js`:

```bash
node setup-admin.js
```

You should see output like:
```
📄 Loading env from: D:\healthCare-system-\patient-service\.env
📋 Configuration:
   Database: mongodb+srv://...
   Admin Email: admin@medico.local
   Admin Name: Administrator

🔗 Connecting to MongoDB...
✅ Connected to MongoDB

👤 Setting up admin account...
✅ Admin created successfully!
   ID: 507f1f77bcf86cd799439011
   Name: Administrator
   Email: admin@medico.local
   Role: admin

✨ Admin account is ready!
```

---

## Step 2: Verify Backend is Running

Make sure the patient-service backend is running:

```bash
# Terminal 1: Start patient-service
cd patient-service
npm start
```

You should see:
```
✅ Server running on port 3002
✅ MongoDB connected
```

---

## Step 3: Verify Frontend is Running

Make sure the frontend is running:

```bash
# Terminal 2: Start frontend
cd frontend
npm start
```

Frontend should be available at: `http://localhost:5173`

---

## Step 4: Clear Browser Cache

Clear your browser's local storage to remove any old login data:

**In browser console (F12 → Console tab):**
```javascript
localStorage.clear()
sessionStorage.clear()
location.reload()
```

**Or manually:**
- Open DevTools (F12)
- Go to "Application" tab
- Click "Local Storage" → Select your domain → Delete All
- Click "Session Storage" → Delete All
- Refresh page (Ctrl+R)

---

## Step 5: Try Login Again

1. **Go to login page:** `http://localhost:5173/login`

2. **Select "Admin" role** - Make sure Admin button is clickable

3. **Enter credentials:**
   - Email: `admin@medico.local`
   - Password: `admin123456`

4. **Click "Sign In"**

---

## Common Issues & Solutions

### ❌ Error: "Cannot connect to MongoDB"

**Cause:** MongoDB server is not running or connection string is wrong

**Fix:**
```bash
# Check if MongoDB is running
# Windows:
mongosh

# If mongosh fails, MongoDB is not running
# Start MongoDB (check your setup instructions)
```

**Verify connection string in `patient-service/.env`:**
```
MONGO_URI=mongodb+srv://root:bishru@books-store-mern.kq25k3n.mongodb.net/medico?appName=Books-Store-MERN
```

---

### ❌ Error: "Invalid email or password"

**Cause:** Wrong credentials or admin account not created

**Fix:**
1. Run the setup script again:
   ```bash
   node setup-admin.js
   ```

2. Check the output credentials carefully

3. Make sure you're using the exact email and password

---

### ❌ Admin button is greyed out / "Coming soon"

**Cause:** Frontend not updated or cache issue

**Fix:**
1. **Restart frontend:**
   ```bash
   # Stop frontend (Ctrl+C)
   # In frontend directory
   npm start
   ```

2. **Clear browser cache:**
   - Press F12 → Application → Clear Storage
   - Refresh page (Ctrl+Shift+R)

---

### ❌ Login works but redirects to patient dashboard

**Cause:** Backend is not returning role field

**Fix:**

1. **Check backend response:**
   - Open DevTools (F12)
   - Go to Network tab
   - Try to login
   - Find the "login" request
   - Check Response tab - should show `"role": "admin"`

2. **If role is missing:**
   - Restart patient-service backend
   - Make sure authController.js has role in response
   - Check Patient.js has role field in schema

3. **Verify files were updated:**
   - Check `patient-service/models/Patient.js` has role field
   - Check `patient-service/controllers/authController.js` returns role
   - Check `frontend/src/pages/auth/LoginPage.jsx` uses role

---

### ❌ "Admin already exists" but still can't login

**Cause:** Password mismatch or role not properly set

**Fix:**

Check admin in database:

```bash
mongosh
use medico
db.patients.findOne({ email: "admin@medico.local" })
```

Output should show:
```javascript
{
  _id: ObjectId(...),
  name: "Administrator",
  email: "admin@medico.local",
  password: "$2a$12$...",  // hashed password
  role: "admin",           // IMPORTANT: must be "admin"
  ...
}
```

If `role` is not "admin" or is missing:
```bash
node setup-admin.js
```

---

## Testing Checklist

After login, verify everything works:

- [ ] Redirected to `/admin/payments`
- [ ] See "Payment Management" title
- [ ] See statistics cards (Total, Pending, Confirmed, Failed)
- [ ] See list of payments
- [ ] Can filter by status
- [ ] Can search payments
- [ ] Can view payment details

---

## Environment Variables

Make sure `patient-service/.env` has:

```env
PORT=3002
MONGO_URI=mongodb+srv://root:bishru@books-store-mern.kq25k3n.mongodb.net/medico?appName=Books-Store-MERN
JWT_SECRET=your_jwt_secret_here
APPOINTMENT_SERVICE_URL=http://localhost:3001
```

---

## Quick Verification Script

Run this to check everything is configured:

```bash
# Check 1: MongoDB connection
node -e "
import('mongoose').then(async (m) => {
  try {
    await m.default.connect('mongodb+srv://root:bishru@books-store-mern.kq25k3n.mongodb.net/medico')
    console.log('✅ MongoDB connected')
    process.exit(0)
  } catch (e) {
    console.error('❌ MongoDB error: ' + e.message)
    process.exit(1)
  }
})
"

# Check 2: Patient model
node -e "
import('./patient-service/models/Patient.js').then(() => {
  console.log('✅ Patient model loads')
  process.exit(0)
}).catch(e => {
  console.error('❌ Patient model error: ' + e.message)
  process.exit(1)
})
"
```

---

## Debug Mode

For detailed debugging, add this to see all messages:

**In browser console:**
```javascript
// Enable detailed logging
localStorage.setItem('debug', '*')
location.reload()

// Watch login response
// Open Network tab in DevTools
// Try to login
// Click the 'login' POST request
// Check Response tab for the data
```

---

## Need Help?

If still stuck, try:

1. **Restart everything:**
   ```bash
   # Stop all terminals (Ctrl+C)
   # Close browser
   # Reopen browser
   # Start backend
   # Start frontend
   ```

2. **Check logs:**
   - Backend console for connection errors
   - Frontend console (F12) for JavaScript errors
   - MongoDB logs if available

3. **Verify setup:**
   ```bash
   # Check admin exists
   node setup-admin.js
   
   # Check backend is responding
   curl http://localhost:3002/api/patients/login
   
   # Check frontend builds
   cd frontend && npm run build
   ```

4. **Nuclear option:**
   ```bash
   # Remove all admin/patient data and restart
   # WARNING: This deletes database!
   # Only do this if needed
   node setup-admin.js  # creates fresh admin
   ```

---

## Success Indicators

✅ **You'll know it worked when:**

1. Setup script says: "✅ Admin created successfully!"
2. Login page shows "Admin" role is selectable
3. Login accepts your credentials
4. You're redirected to `/admin/payments`
5. You see the payment management dashboard
6. Console shows no errors (F12)

---

**Still having issues? Check the logs and error messages carefully - they usually tell you exactly what's wrong!** 🔍
