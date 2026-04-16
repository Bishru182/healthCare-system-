// middleware/roleCheck.middleware.js
// ─────────────────────────────────────────────
// Role-based access control middleware
// ─────────────────────────────────────────────

import { HTTP_STATUS } from '../config/constants.js';

/**
 * Middleware to check if user has required role
 * @param {string} requiredRole - Role to check (e.g., 'admin', 'doctor')
 * @returns {Function} Middleware function
 */
export const roleCheck = (requiredRole) => (req, res, next) => {
  const userRole = req.user?.role;

  if (!userRole || userRole !== requiredRole) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: `Access denied. ${requiredRole} role required.`,
    });
  }

  next();
};

export default roleCheck;
