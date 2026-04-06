/**
 * Role-based authorization middleware.
 * Restricts access to users with one of the specified roles.
 *
 * @param  {...string} allowedRoles – e.g. "patient", "doctor"
 * @returns Express middleware
 *
 * Usage:  router.post("/", auth, roleCheck("patient"), createAppointment);
 */
const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }
    next();
  };
};

export default roleCheck;
