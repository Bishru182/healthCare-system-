import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import bcryptjs from 'bcryptjs'
import Patient from '../models/Patient.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

const seedDatabase = async () => {
  try {
    console.log('\n🌱 Starting Database Seeding...\n')

    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log('✅ Connected to MongoDB\n')

    // Clear existing data (optional)
    console.log('🗑️  Clearing existing patient records...')
    await Patient.deleteMany({})
    console.log('✅ Cleared existing data\n')

    // Hash passwords
    const adminPassword = await bcryptjs.hash('admin123456', 12)
    const patientPassword = await bcryptjs.hash('patient123456', 12)

    // Seed data
    const seedData = [
      {
        name: 'Administrator',
        email: 'admin@medico.local',
        password: adminPassword,
        role: 'admin',
        age: 35,
        phone: '+1-555-0001',
      },
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: patientPassword,
        role: 'patient',
        age: 28,
        phone: '+1-555-0010',
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: patientPassword,
        role: 'patient',
        age: 32,
        phone: '+1-555-0020',
      },
      {
        name: 'Mike Johnson',
        email: 'mike@example.com',
        password: patientPassword,
        role: 'patient',
        age: 45,
        phone: '+1-555-0030',
      },
    ]

    console.log('📝 Creating seed records...')
    const createdPatients = await Patient.insertMany(seedData)
    console.log(`✅ Created ${createdPatients.length} records\n`)

    // Display created records
    console.log('📋 Seeded Records:')
    console.log('─'.repeat(60))
    createdPatients.forEach((patient, index) => {
      console.log(`\n${index + 1}. ${patient.name}`)
      console.log(`   Email: ${patient.email}`)
      console.log(`   Role: ${patient.role}`)
      console.log(`   Age: ${patient.age}`)
      console.log(`   Phone: ${patient.phone}`)
    })
    console.log('\n' + '─'.repeat(60))

    // Login instructions
    console.log('\n🎯 Login Credentials:\n')
    console.log('📌 ADMIN ACCOUNT:')
    console.log('   Email: admin@medico.local')
    console.log('   Password: admin123456')
    console.log('   Role: Admin\n')
    
    console.log('📌 TEST PATIENT ACCOUNTS:')
    console.log('   Email: john@example.com')
    console.log('   Password: patient123456')
    console.log('   Role: Patient\n')
    
    console.log('   Email: jane@example.com')
    console.log('   Password: patient123456')
    console.log('   Role: Patient\n')
    
    console.log('   Email: mike@example.com')
    console.log('   Password: patient123456')
    console.log('   Role: Patient\n')

    console.log('🌐 Go to: http://localhost:5173/login')
    console.log('✅ Database seeding completed successfully!\n')

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Seeding Error:', error.message)
    console.error('\n💡 Troubleshooting:')
    console.error('   1. Make sure MongoDB is running')
    console.error('   2. Check MONGO_URI in .env file')
    console.error('   3. Verify network connection')
    console.error('   4. Check if Patient model is imported correctly\n')
    process.exit(1)
  } finally {
    await mongoose.disconnect()
  }
}

// Run seeder
seedDatabase()
