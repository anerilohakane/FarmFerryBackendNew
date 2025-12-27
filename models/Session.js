import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    refreshToken: String,
    expiresAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.Session ||
  mongoose.model("Session", sessionSchema);
