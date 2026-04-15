// middleware/auth.middleware.js
// ─────────────────────────────────────────────
// JWT Authentication Middleware
// Validates the Bearer token and attaches req.user
// ─────────────────────────────────────────────

import jwt from 'jsonwebtoken';
import { HTTP_STATUS } from '../config/constants.js';

const authMiddleware = (req, res, next) => {
  try {
    // 1. Extract the Authorization header
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // 2. Pull the raw token
    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Access denied. Malformed authorization header.',
      });
    }

    // 3. Verify and decode
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach user payload to request
    //    Expected token payload: { id, email, role, ... }
    req.user = decoded;

    next();
  } catch (error) {
    // Distinguish between expired tokens and other errors
    if (error.name === 'TokenExpiredError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Token expired. Please log in again.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: 'Authentication failed.',
      error: error.message,
    });
  }
};

export default authMiddleware;
