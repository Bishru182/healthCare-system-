// server.js
// ─────────────────────────────────────────────
// Entry Point – starts the HTTP server and connects to MongoDB.
// Handles graceful shutdown on SIGTERM / SIGINT.
// ─────────────────────────────────────────────

import 'dotenv/config';
import app       from './app.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 5003;

// ─────────────────────────────────────────────
// Boot sequence
// ─────────────────────────────────────────────
const startServer = async () => {
  try {
    // 1. Connect to MongoDB first
    await connectDB();

    // 2. Start the HTTP listener
    const server = app.listen(PORT, () => {
      console.log('─────────────────────────────────────────────');
      console.log(`🚀  Payment Service running on port ${PORT}`);
      console.log(`📦  Provider : ${process.env.PAYMENT_PROVIDER || 'mock'}`);
      console.log(`🌍  Env      : ${process.env.NODE_ENV || 'development'}`);
      console.log(`❤️   Health   : http://localhost:${PORT}/health`);
      console.log('─────────────────────────────────────────────');
    });

    // ─── Graceful Shutdown ──────────────────────────────────────────────
    const shutdown = (signal) => {
      console.log(`\n⚠️  ${signal} received – shutting down gracefully...`);

      server.close(async () => {
        console.log('🔌  HTTP server closed.');

        // Allow Mongoose to flush pending operations
        const mongoose = await import('mongoose');
        await mongoose.default.connection.close();
        console.log('🔌  MongoDB connection closed.');
        console.log('✅  Payment Service stopped cleanly.');
        process.exit(0);
      });

      // Force exit after 10 s if graceful shutdown stalls
      setTimeout(() => {
        console.error('💥  Forced shutdown after timeout.');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    // ─── Unhandled Rejection Guard ──────────────────────────────────────
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥  Unhandled Rejection at:', promise, 'reason:', reason);
      // Optionally: shutdown(reason)
    });

    process.on('uncaughtException', (error) => {
      console.error('💥  Uncaught Exception:', error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('💥  Failed to start Payment Service:', error.message);
    process.exit(1);
  }
};

startServer();
