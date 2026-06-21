import mongoose from "mongoose";

const otpSchema = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300, // 5 minutes TTL
    },
  },
  { timestamps: true }
);

// Add index on email for faster query
otpSchema.index({ email: 1 });

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;
