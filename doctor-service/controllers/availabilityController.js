import Availability from "../models/Availability.js";

/**
 * @route POST /api/doctors/availability
 */
export const createSlot = async (req, res, next) => {
  try {
    const { dayOfWeek, startTime, endTime, slotDurationMinutes } = req.body;
    if (!dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "dayOfWeek, startTime, endTime are required.",
      });
    }
    const slot = await Availability.create({
      doctorId: req.user.id,
      dayOfWeek,
      startTime,
      endTime,
      slotDurationMinutes: slotDurationMinutes || 30,
    });
    res.status(201).json({ success: true, slot });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/doctors/availability/mine
 */
export const getMySlots = async (req, res, next) => {
  try {
    const slots = await Availability.find({ doctorId: req.user.id }).sort({
      dayOfWeek: 1,
      startTime: 1,
    });
    res.status(200).json({ success: true, count: slots.length, slots });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/doctors/:id/availability   (public)
 */
export const getDoctorAvailability = async (req, res, next) => {
  try {
    const slots = await Availability.find({
      doctorId: req.params.id,
      isActive: true,
    }).sort({ dayOfWeek: 1, startTime: 1 });
    res.status(200).json({ success: true, count: slots.length, slots });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/doctors/availability/:slotId
 */
export const updateSlot = async (req, res, next) => {
  try {
    const slot = await Availability.findOneAndUpdate(
      { _id: req.params.slotId, doctorId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!slot) {
      return res
        .status(404)
        .json({ success: false, message: "Slot not found." });
    }
    res.status(200).json({ success: true, slot });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/doctors/availability/:slotId
 */
export const deleteSlot = async (req, res, next) => {
  try {
    const slot = await Availability.findOneAndDelete({
      _id: req.params.slotId,
      doctorId: req.user.id,
    });
    if (!slot) {
      return res
        .status(404)
        .json({ success: false, message: "Slot not found." });
    }
    res.status(200).json({ success: true, message: "Slot removed." });
  } catch (error) {
    next(error);
  }
};
