import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: true,
      unique: true,
    },
    name: String,
    role: {
      type: String,
      enum: ["customer", "admin", "delivery", "supplier"],
      default: "customer",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Customer || mongoose.model("Customer", customerSchema);
