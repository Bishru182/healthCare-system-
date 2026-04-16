import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import Patient from "../models/Patient.js";

// ---------- helpers ----------

const generateToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

// ---------- validation rules ----------

export const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

export const loginRules = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

// ---------- controllers ----------

/**
 * @desc    Register a new patient
 * @route   POST /api/patients/register
 */
export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, age, phone } = req.body;

    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered." });
    }

    const patient = await Patient.create({ name, email, password, age, phone });

    res.status(201).json({
      success: true,
      message: "Patient registered successfully.",
      token: generateToken(patient),
      patient: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        age: patient.age,
        phone: patient.phone,
        role: patient.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login patient
 * @route   POST /api/patients/login
 */
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const patient = await Patient.findOne({ email }).select("+password");
    if (!patient) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    const isMatch = await patient.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token: generateToken(patient),
      patient: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        age: patient.age,
        phone: patient.phone,
        role: patient.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
