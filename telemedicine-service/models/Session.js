import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    roomName: {
      type: String,
      required: true,
      unique: true,
    },
    jitsiDomain: {
      type: String,
      default: "meet.jit.si",
    },
    meetingUrl: String,
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled"],
      default: "scheduled",
    },
    scheduledAt: Date,
    startedAt: Date,
    endedAt: Date,
    durationSeconds: { type: Number, default: 0 },
    consultationNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

const Session = mongoose.model("TelemedicineSession", sessionSchema);
export default Session;
