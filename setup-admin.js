#!/usr/bin/env node

/**
 * Setup Admin User Script
 * Connects to MongoDB and creates/updates admin account
 * Usage: node setup-admin.js
 */

import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import bcryptjs from 'bcryptjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment from patient-service
const envPath = path.join(__dirname, 'patient-service', '.env')
console.log(`📄 Loading env from: ${envPath}`)
dotenv.config({ path: envPath })

// Admin credentials (can be customized via env vars)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@medico.local'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456'
const ADMIN_NAME = process.env.ADMIN_NAME || 'Administrator'

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/medico'

console.log(`\n📋 Configuration:`)
console.log(`   Database: ${MONGO_URI.substring(0, 50)}...`)
console.log(`   Admin Email: ${ADMIN_EMAIL}`)
console.log(`   Admin Name: ${ADMIN_NAME}`)

// Define Patient schema
const patientSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, lowercase: true },
    password: String,
    age: Number,
    phone: String,
    role: { type: String, enum: ['patient', 'admin'], default: 'patient' },
  },
  { timestamps: true }
)

// Create model
const Patient = mongoose.model('Patient', patientSchema)

async function setupAdmin() {
  try {
    console.log('\n🔗 Connecting to MongoDB...')
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log('✅ Connected to MongoDB')

    console.log('\n👤 Setting up admin account...')

    // Check if admin exists
    const existing = await Patient.findOne({ email: ADMIN_EMAIL })

    if (existing) {
      console.log(`⚠️  Account exists: ${ADMIN_EMAIL}`)
      if (existing.role === 'admin') {
        console.log(`✅ Already an admin!`)
        console.log(`\n🎯 Login credentials:`)
        console.log(`   Email: ${ADMIN_EMAIL}`)
        console.log(`   Password: ${ADMIN_PASSWORD}`)
        console.log(`   URL: http://localhost:5173/login`)
      } else {
        console.log(`📝 Upgrading to admin role...`)
        existing.role = 'admin'
        await existing.save()
        console.log(`✅ Upgraded to admin!`)
      }
    } else {
      console.log(`📝 Creating new admin account...`)

      // Hash password
      const salt = await bcryptjs.genSalt(12)
      const hashedPassword = await bcryptjs.hash(ADMIN_PASSWORD, salt)

      // Create admin
      const admin = await Patient.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        phone: '+1-555-0000',
        age: 30,
      })

      console.log(`✅ Admin created successfully!`)
      console.log(`   ID: ${admin._id}`)
      console.log(`   Name: ${admin.name}`)
      console.log(`   Email: ${admin.email}`)
      console.log(`   Role: ${admin.role}`)
    }

    console.log(`\n✨ Admin account is ready!`)
    console.log(`\n🌐 Go to: http://localhost:5173/login`)
    console.log(`   Select: Admin`)
    console.log(`   Email: ${ADMIN_EMAIL}`)
    console.log(`   Password: ${ADMIN_PASSWORD}`)

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`)
    if (error.code === 'ECONNREFUSED') {
      console.error(`\n💡 Cannot connect to MongoDB. Make sure:`)
      console.error(`   1. MongoDB is running`)
      console.error(`   2. MONGO_URI in patient-service/.env is correct`)
      console.error(`   3. Network connection is available`)
    }
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log(`\n🔌 Disconnected from MongoDB\n`)
  }
}

setupAdmin()
