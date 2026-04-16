import Doctor, { SPECIALTIES } from "../models/Doctor.js";

const NOTIFICATION_URL =
  process.env.NOTIFICATION_SERVICE_URL || "http://notification-service:5005";
const INTERNAL_API_KEY =
  process.env.INTER_SERVICE_API_KEY || "medico-internal-key-change-me";

const notifyDoctorVerified = async (doctor) => {
  if (!NOTIFICATION_URL) return;

  const recipient = { name: doctor.name };
  if (doctor.email) recipient.email = doctor.email;
  if (doctor.phone) recipient.phone = doctor.phone;

  if (!recipient.email && !recipient.phone) return;

  try {
    await fetch(`${NOTIFICATION_URL}/api/notifications/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "DOCTOR_VERIFIED",
        channels: ["email", "sms", "whatsapp"],
        recipients: [recipient],
        data: {},
      }),
    });
  } catch (error) {
    console.warn(`⚠️  Failed to send verification notification to Dr. ${doctor.name}: ${error.message}`);
  }
};

const hasValidInternalApiKey = (req) => {
  const provided = req.headers["x-internal-api-key"];
  return typeof provided === "string" && provided === INTERNAL_API_KEY;
};

/**
 * @route GET /api/doctors/specialties
 * Returns list of supported specialties (public).
 */
export const getSpecialties = (_req, res) => {
  res.status(200).json({ success: true, specialties: SPECIALTIES });
};

/**
 * @route GET /api/doctors
 * Public listing of bookable doctors (active + verified).
 */
export const listDoctors = async (req, res, next) => {
  try {
    const { specialty, q } = req.query;
    const filter = { isActive: true, isVerified: true };
    if (specialty) filter.specialty = specialty;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { specialty: { $regex: q, $options: "i" } },
      ];
    }

    const doctors = await Doctor.find(filter).sort({ rating: -1, name: 1 });
    res
      .status(200)
      .json({ success: true, count: doctors.length, doctors });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/doctors/admin/pending   (admin only)
 * Returns doctors waiting for admin verification.
 */
export const listPendingDoctors = async (_req, res, next) => {
  try {
    const doctors = await Doctor.find({ isActive: true, isVerified: false }).sort({
      createdAt: 1,
      name: 1,
    });

    res.status(200).json({ success: true, count: doctors.length, doctors });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/doctors/me
 */
export const getMe = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.user.id);
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found." });
    }
    res.status(200).json({ success: true, doctor });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/doctors/me
 */
export const updateMe = async (req, res, next) => {
  try {
    const allowed = [
      "name",
      "phone",
      "specialty",
      "licenseNumber",
      "experience",
      "consultationFee",
      "bio",
      "avatar",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (updates.specialty && !SPECIALTIES.includes(updates.specialty)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid specialty." });
    }

    const doctor = await Doctor.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found." });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated.",
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/doctors/me
 */
export const deleteMe = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.user.id);
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found." });
    }
    res.status(200).json({ success: true, message: "Account deleted." });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/doctors/:id
 * Public — used by patient portal to view a bookable doctor's profile.
 */
export const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findOne({
      _id: req.params.id,
      isActive: true,
      isVerified: true,
    });
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found or unavailable for booking." });
    }
    res.status(200).json({ success: true, doctor });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/doctors/internal/:id/contact
 * Trusted internal route for inter-service notifications.
 */
export const getInternalDoctorContact = async (req, res, next) => {
  try {
    if (!hasValidInternalApiKey(req)) {
      return res.status(401).json({ success: false, message: "Unauthorized internal request." });
    }

    const doctor = await Doctor.findById(req.params.id).select("name email phone");
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found." });
    }

    return res.status(200).json({
      success: true,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/doctors/:id/verify   (admin only)
 */
export const verifyDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    );
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found." });
    }

    // Fire-and-forget: notify the doctor their account is approved
    void notifyDoctorVerified(doctor);

    res.status(200).json({
      success: true,
      message: "Doctor verified.",
      doctor,
    });
  } catch (error) {
    next(error);
  }
};
