import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import Session from "@/models/Session";
import { verifyOTP } from "@/services/otp.service";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/services/token.service";
import { apiResponse } from "@/utils/apiResponse";

export async function POST(req) {
  await connectDB();

  const { mobile, otp } = await req.json();

  if (!verifyOTP(otp)) {
    return apiResponse(401, false, "Invalid OTP");
  }

  const user = await User.findOne({ mobile });
  user.isVerified = true;
  await user.save();

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await Session.create({
    userId: user._id,
    refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return apiResponse(200, true, "Login successful", {
    accessToken,
    refreshToken,
    user,
  });
}
