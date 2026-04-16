import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const SPECIALTIES = [
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Neurologist",
  "Pediatrician",
  "Gynecologist",
  "Orthopedic",
  "Psychiatrist",
  "ENT Specialist",
  "Ophthalmologist",
  "Dentist",
  "Endocrinologist",
];

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    specialty: {
      type: String,
      required: [true, "Specialty is required"],
      enum: SPECIALTIES,
    },
    phone: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    experience: { type: Number, default: 0, min: 0 },
    consultationFee: { type: Number, default: 0, min: 0 },
    bio: { type: String, default: "", trim: true },
    avatar: { type: String, default: "" },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

doctorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

doctorSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

export { SPECIALTIES };
const Doctor = mongoose.model("Doctor", doctorSchema);
export default Doctor;
