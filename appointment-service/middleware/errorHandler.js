const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${err.message}`);
  console.error("[FULL ERROR]", err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: "Validation error", errors: messages });
  }

  // Mongoose duplicate key error (e.g. double-booking)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern).join(", ");
    return res.status(409).json({
      success: false,
      message: `Duplicate booking detected. A conflicting appointment already exists for the same ${fields}.`,
    });
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token." });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Token expired." });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

export default errorHandler;
