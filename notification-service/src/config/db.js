// src/config/db.js
// ─────────────────────────────────────────────
// MongoDB connection using Mongoose
// ─────────────────────────────────────────────

import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Recommended options for Mongoose 8+
      serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB is unreachable
    });

    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌  MongoDB connection error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
