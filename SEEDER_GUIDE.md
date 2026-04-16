# 🌱 Database Seeder Guide

## Quick Start

Run the seeder to populate the database with test data including an admin account:

```bash
cd patient-service
npm run seed
```

---

## What the Seeder Does

✅ **Connects to MongoDB** - Using your `.env` configuration
✅ **Clears existing data** - Removes all patient records
✅ **Creates seed records:**
  - 1 Admin account
  - 3 Test patient accounts
✅ **Hashes passwords** - Securely using bcryptjs
✅ **Displays credentials** - Shows all login info

---

## Output Example

When you run the seeder, you'll see:

```
🌱 Starting Database Seeding...

🔗 Connecting to MongoDB...
✅ Connected to MongoDB

🗑️  Clearing existing patient records...
✅ Cleared existing data

📝 Creating seed records...
✅ Created 4 records

📋 Seeded Records:
────────────────────────────────────────────────────────

1. Administrator
   Email: admin@medico.local
   Role: admin
   Age: 35
   Phone: +1-555-0001

2. John Doe
   Email: john@example.com
   Role: patient
   Age: 28
   Phone: +1-555-0010

3. Jane Smith
   Email: jane@example.com
   Role: patient
   Age: 32
   Phone: +1-555-0020

4. Mike Johnson
   Email: mike@example.com
   Role: patient
   Age: 45
   Phone: +1-555-0030

────────────────────────────────────────────────────────

🎯 Login Credentials:

📌 ADMIN ACCOUNT:
   Email: admin@medico.local
   Password: admin123456
   Role: Admin

📌 TEST PATIENT ACCOUNTS:
   Email: john@example.com
   Password: patient123456
   Role: Patient

   Email: jane@example.com
   Password: patient123456
   Role: Patient

   Email: mike@example.com
   Password: patient123456
   Role: Patient

🌐 Go to: http://localhost:5173/login
✅ Database seeding completed successfully!
```

---

## Login as Admin

After running the seeder:

1. **Go to:** `http://localhost:5173/login`
2. **Select role:** `Admin`
3. **Enter credentials:**
   - Email: `admin@medico.local`
   - Password: `admin123456`
4. **Click Sign In**

You'll be redirected to `/admin/payments` dashboard! 🎉

---

## Test Patient Accounts

You can also test with patient accounts:

**Account 1:**
- Email: `john@example.com`
- Password: `patient123456`

**Account 2:**
- Email: `jane@example.com`
- Password: `patient123456`

**Account 3:**
- Email: `mike@example.com`
- Password: `patient123456`

---

## Seeder Script Location

```
patient-service/
├── seeders/
│   └── seed.js          ← The seeder script
├── package.json         ← Updated with "seed" command
└── ...
```

---

## How to Customize

Edit `patient-service/seeders/seed.js` to:

1. **Change passwords:**
   ```javascript
   const adminPassword = await bcryptjs.hash('YOUR_PASSWORD', 12)
   const patientPassword = await bcryptjs.hash('YOUR_PASSWORD', 12)
   ```

2. **Add more test users:**
   ```javascript
   const seedData = [
     // ... existing users ...
     {
       name: 'New User',
       email: 'newuser@example.com',
       password: patientPassword,
       role: 'patient',
       age: 25,
       phone: '+1-555-0040',
     },
   ]
   ```

3. **Keep existing data (don't clear):**
   ```javascript
   // Comment out this line:
   // await Patient.deleteMany({})
   ```

---

## Troubleshooting

### ❌ "Cannot connect to MongoDB"

**Fix:**
1. Make sure MongoDB is running
2. Check `MONGO_URI` in `patient-service/.env`
3. Verify internet connection for cloud MongoDB

```bash
# Test MongoDB connection
mongosh "your-connection-string"
```

### ❌ "Patient model not found"

**Fix:** Make sure you're in the `patient-service` directory:

```bash
cd patient-service
npm run seed
```

### ❌ "EACCES: permission denied"

**Fix:** On Linux/Mac, you may need sudo:

```bash
sudo npm run seed
```

### ❌ "Port already in use"

This is OK - the seeder doesn't start a server, just connects to the database.

---

## Seeder Flow Diagram

```
Start
  ↓
Load .env variables
  ↓
Connect to MongoDB
  ↓
Clear existing records
  ↓
Hash passwords (bcryptjs)
  ↓
Insert seed data
  ↓
Display created records
  ↓
Show login credentials
  ↓
Disconnect from MongoDB
  ↓
Exit (success or error)
```

---

## File Structure

The seeder is located at:

```javascript
// patient-service/seeders/seed.js

import Patient from '../models/Patient.js'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

// Connects to DB
// Creates admin + test patients
// Shows login credentials
```

---

## Next Steps

After seeding:

1. ✅ Start the backend: `npm start` (in patient-service)
2. ✅ Start the frontend: `npm start` (in frontend)
3. ✅ Go to http://localhost:5173/login
4. ✅ Login as admin@medico.local
5. ✅ Access payment management at `/admin/payments`

---

## Important Notes

⚠️ **The seeder clears all existing data by default**
- If you have important data, comment out the `deleteMany()` line
- Or run it on a test database only

✅ **Passwords are hashed** 
- Admin password: `admin123456`
- Patient password: `patient123456`
- Hashes are generated fresh each run

✅ **Safe to run multiple times**
- Will clear and recreate data each time
- Useful for resetting test environment

---

## Summary

| Action | Command |
|--------|---------|
| Run seeder | `npm run seed` |
| Location | `patient-service/seeders/seed.js` |
| Creates | 1 admin + 3 test patients |
| Clears data | Yes (configurable) |
| Time to run | < 5 seconds |

**Ready? Run:** `npm run seed` 🚀
