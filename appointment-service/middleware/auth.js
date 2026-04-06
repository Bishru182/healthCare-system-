import jwt from "jsonwebtoken";

/**
 * JWT authentication middleware.
 * Extracts user ID and role from the token and attaches them to req.user.
 * Supports tokens from both Patient Service and Doctor Service.
 */
const auth = (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "Access denied. No token provided." });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to request — works with any service's token
    req.user = {
      id: decoded.id,
      role: decoded.role || "patient", // default to patient for backward-compat
    };

    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token." });
  }
};

export default auth;
