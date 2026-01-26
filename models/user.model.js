import mongoose from "mongoose";
import bcrypt from "bcryptjs";
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "name is required"],
    },
    email: {
      type: String,
      required: [true, "email is required"],
    },
    phone: {
      type: String,
      required: [true, "phone is required"],
    },
    password: {
      type: String,
      required: [true, "password is required"],
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
    otp: {
      type: String,
      default: "",
    },
    otpExpireTime: {
      type: Date,
    },
    exam: {
      type: String,
      enum: [
        "pte-academic",
        "pte-core",
        "ielts-academic",
        "ielts-general",
        "dueolingo",
        "celpip-general",
        "celpip-general-ls",
      ],
    },
  },
  {
    timestamps: true,
  },
);

userSchema.add({
  isPremium: {
    type: Boolean,
    default: false,
  },
  planType: {
    type: String, // "7 Days", "15 Days", "30 Days", "60 Days"
  },
  subscriptionExpiry: {
    type: Date,
  },
  paymentId: {
    type: String,
  },
  practiceAttemptCount: {
    type: Number,
    default: 0,
  },
  vouchersOwned: {
    type: Number,
    default: 0,
  },
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

export default mongoose.model("User", userSchema);
