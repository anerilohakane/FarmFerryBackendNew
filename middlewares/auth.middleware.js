import jwt from "jsonwebtoken";
import User from "@/models/User";
import connectDB from "@/lib/connectDB";

export const authMiddleware = async (req) => {
  try {
    await connectDB();

    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { error: "Authorization token missing" };
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET
    );

    const user = await User.findById(decoded.userId).select("-__v");

    if (!user) {
      return { error: "User not found" };
    }

    return { user };
  } catch (error) {
    return { error: "Invalid or expired token" };
  }
};
