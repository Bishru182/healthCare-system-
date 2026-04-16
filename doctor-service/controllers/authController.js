import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import Doctor, { SPECIALTIES } from "../models/Doctor.js";

const generateToken = (id) =>
  jwt.sign({ id, role: "doctor" }, process.env.JWT_SECRET, { expiresIn: "7d" });

export const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("specialty")
    .isIn(SPECIALTIES)
    .withMessage(`Specialty must be one of: ${SPECIALTIES.join(", ")}`),
];

export const loginRules = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

/**
 * @route POST /api/doctors/register
 */
export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name,
      email,
      password,
      specialty,
      phone,
      licenseNumber,
      experience,
      consultationFee,
      bio,
    } = req.body;

    const existing = await Doctor.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered." });
    }

    const doctor = await Doctor.create({
      name,
      email,
      password,
      specialty,
      phone,
      licenseNumber,
      experience,
      consultationFee,
      bio,
    });

    res.status(201).json({
      success: true,
      message: "Doctor registered successfully. Pending admin verification.",
      token: generateToken(doctor._id),
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty,
        phone: doctor.phone,
        experience: doctor.experience,
        consultationFee: doctor.consultationFee,
        isVerified: doctor.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/doctors/login
 */
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const doctor = await Doctor.findOne({ email }).select("+password");
    if (!doctor) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    const isMatch = await doctor.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    if (!doctor.isActive) {
      return res
        .status(403)
        .json({ success: false, message: "Account is deactivated." });
    }

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token: generateToken(doctor._id),
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty,
        phone: doctor.phone,
        experience: doctor.experience,
        consultationFee: doctor.consultationFee,
        isVerified: doctor.isVerified,
        bio: doctor.bio,
      },
    });
  } catch (error) {
    next(error);
  }
};
