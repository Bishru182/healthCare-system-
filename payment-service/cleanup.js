import 'dotenv/config'
import mongoose from 'mongoose'
import Payment from './models/Payment.js'

const cleanup = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log('✅ Connected\n')

    console.log('🗑️  Deleting all payments...')
    const result = await Payment.deleteMany({})
    console.log(`✅ Deleted ${result.deletedCount} payments\n`)

    console.log('✅ Cleanup complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

cleanup()
