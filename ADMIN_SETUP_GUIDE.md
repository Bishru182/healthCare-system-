# 🛡️ Admin Account Setup Guide

## Overview
The healthcare system now supports both **Patient** and **Admin** roles. Follow this guide to create an admin account.

---

## Method 1: Using Node Script (Recommended) ✅

### Prerequisites
- Node.js installed
- MongoDB running
- Backend services configured

### Steps

1. **From the root directory, run:**
   ```bash
   node create-admin.js
   ```

2. **The script will:**
   - Connect to your MongoDB database
   - Create an admin account with default credentials
   - Display the login credentials

3. **Default Credentials:**
   - Email: `admin@medico.local`
   - Password: `admin123456`

4. **Customize with Environment Variables:**
   ```bash
   # Windows PowerShell
   $env:ADMIN_EMAIL="your-email@domain.com"
   $env:ADMIN_PASSWORD="your-secure-password"
   $env:ADMIN_NAME="Your Admin Name"
   node create-admin.js

   # Linux/Mac
   export ADMIN_EMAIL="your-email@domain.com"
   export ADMIN_PASSWORD="your-secure-password"
   export ADMIN_NAME="Your Admin Name"
   node create-admin.js
   ```

---

## Method 2: Direct MongoDB Command

If you prefer to create the admin directly in MongoDB:

### Using MongoDB Shell

1. **Open MongoDB Shell:**
   ```bash
   mongosh  # or mongo (for older versions)
   ```

2. **Connect to your healthcare database:**
   ```javascript
   use healthcare
   ```

3. **Insert admin user (password needs to be hashed):**
   ```javascript
   // First, create a test patient to get bcrypt format
   // OR use this pre-hashed password (bcrypt hash of "admin123456"):
   // $2a$12$9Q9Z9Q9Z9Q9Z9Q9Z9Q9Z9OZ9Q9Z9Q9Z9Q9Z9Q9Z9Q9Z9Q9Z9Q9Z9.
   
   db.patients.insertOne({
     name: "Administrator",
     email: "admin@medico.local",
     password: "$2a$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP", // hashed password
     role: "admin",
     phone: "+1-555-0000",
     age: 30,
     createdAt: new Date(),
     updatedAt: new Date()
   })
   ```

   > ⚠️ Note: The password above is a placeholder. Use Method 1 (Node script) for proper password hashing.

---

## Method 3: Convert Existing Patient to Admin

If you already have a patient account and want to make it an admin:

### Using Node.js REPL

```bash
node
```

```javascript
import mongoose from 'mongoose'
import Patient from './patient-service/models/Patient.js'

await mongoose.connect('mongodb://localhost:27017/healthcare')
const patient = await Patient.findOne({ email: 'your-email@domain.com' })
patient.role = 'admin'
await patient.save()
console.log('✅ User is now admin!')
process.exit()
```

### Using MongoDB Shell

```javascript
use healthcare
db.patients.updateOne(
  { email: "your-email@domain.com" },
  { $set: { role: "admin" } }
)
```

---

## Login as Admin

1. **Go to login page:** `http://localhost:5173/login`

2. **Select "Admin" role** from the role selector

3. **Enter credentials:**
   - Email: `admin@medico.local` (or your custom email)
   - Password: `admin123456` (or your custom password)

4. **Click "Sign In"**

5. **You'll be redirected to:** `/admin/payments`

---

## Admin Features Available

Once logged in as admin, you can:

✅ **Payment Management**
- View all system payments
- Filter by status (Pending, Confirmed, Failed)
- Search by Payment ID, Transaction ID, or Appointment ID
- Approve pending payments
- Reject payments with failure reason
- View complete payment details

✅ **Statistics**
- Total payment count
- Pending payments count
- Confirmed payments count
- Failed payments count

---

## Verification Checklist

After creating your admin account:

- [ ] Run `node create-admin.js` successfully
- [ ] See success message with credentials
- [ ] Go to login page
- [ ] Select "Admin" role (should now be enabled)
- [ ] Login with admin credentials
- [ ] See payment management dashboard
- [ ] No errors in console

---

## Troubleshooting

### ❌ Script fails to connect
- **Check:** MongoDB is running
- **Check:** `MONGODB_URI` in `.env` is correct
- **Fix:** Update connection string in `patient-service/.env`

### ❌ Password not working after creating admin
- **Cause:** Password hashing may have failed
- **Fix:** Delete the admin user and run the script again

### ❌ Still seeing patient dashboard after login
- **Cause:** Role not being sent from backend
- **Fix:** Restart both frontend and backend services
- **Check:** Backend returns `role` in login response

### ❌ Admin role selector not visible
- **Cause:** Frontend cache
- **Fix:** Clear browser cache and reload

---

## Security Notes

⚠️ **Important:** After creating the admin account:

1. **Change the default password immediately**
   - Click on admin profile → Settings
   - Update to a strong password

2. **Use strong passwords**
   - Minimum 12 characters
   - Mix uppercase, lowercase, numbers, symbols

3. **Protect credentials**
   - Don't share admin credentials
   - Use environment variables for sensitive data

4. **Audit logs** (future feature)
   - Admin actions should be logged
   - Regular security reviews recommended

---

## Quick Commands Reference

### Create Admin with Script
```bash
node create-admin.js
```

### Create Admin with Custom Credentials
```bash
$env:ADMIN_EMAIL="admin@company.com"; $env:ADMIN_PASSWORD="SecurePass123!"; node create-admin.js
```

### Verify Admin Exists
```bash
node -e "
import mongoose from 'mongoose'
import Patient from './patient-service/models/Patient.js'
await mongoose.connect('mongodb://localhost:27017/healthcare')
const admin = await Patient.findOne({ role: 'admin' })
console.log(admin ? '✅ Admin exists: ' + admin.email : '❌ No admin found')
process.exit()
"
```

---

## What's Changed?

The following updates enable admin functionality:

### Backend Changes
- ✅ `Patient` model now has `role` field (enum: ['patient', 'admin'])
- ✅ Login response includes `role` field
- ✅ Register response includes `role` field

### Frontend Changes
- ✅ LoginPage now accepts 'admin' role selection
- ✅ Login redirects to `/admin/payments` for admins
- ✅ AuthContext properly stores and uses role

### Routes
- ✅ `/admin/payments` - Admin dashboard (role protected)
- ✅ `/admin/payments/:id` - Payment details (role protected)

---

## Support

If you encounter any issues:

1. **Check MongoDB connection**
2. **Verify .env files are set up**
3. **Restart all services**
4. **Check browser console for errors**
5. **Clear localStorage:** `localStorage.clear()`

---

**You're all set! 🚀 Admin account creation is now fully functional.**
