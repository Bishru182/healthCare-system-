#!/usr/bin/env node

/**
 * Script to create an admin user in the database
 * Run: node create-admin.js
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import Patient from './patient-service/models/Patient.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables from patient-service .env
dotenv.config({ path: path.join(__dirname, 'patient-service', '.env') })

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@medico.local'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456'
const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrator'

async function createAdmin() {
  try {
    console.log('🔗 Connecting to MongoDB...')
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/medico'
    console.log('📍 Connection string:', mongoUri.substring(0, 40) + '...')
    
    await mongoose.connect(mongoUri)

    console.log('📝 Creating admin account...')
    
    // Check if admin already exists
    const existingAdmin = await Patient.findOne({ email: ADMIN_EMAIL })
    if (existingAdmin) {
      if (existingAdmin.role === 'admin') {
        console.log(`✅ Admin already exists: ${ADMIN_EMAIL}`)
      } else {
        console.log(`⚠️  User exists but is not admin. Updating role...`)
        existingAdmin.role = 'admin'
        await existingAdmin.save()
        console.log(`✅ User upgraded to admin: ${ADMIN_EMAIL}`)
      }
    } else {
      // Create new admin
      const admin = await Patient.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
        phone: '+1-555-0000',
        age: 30,
      })

      console.log('✅ Admin account created successfully!')
      console.log(`   Email: ${admin.email}`)
      console.log(`   Name: ${admin.name}`)
      console.log(`   Role: ${admin.role}`)
    }

    console.log('\n🎯 You can now login as admin:')
    console.log(`   URL: http://localhost:5173/login`)
    console.log(`   Email: ${ADMIN_EMAIL}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)
    console.log(`\n💡 Tip: Change your password after first login!`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await mongoose.connection.close()
    process.exit(0)
  }
}

createAdmin()
