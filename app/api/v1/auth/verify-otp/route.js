import connectDB from "@/lib/connectDB";
import User from "@/models/Customer";
import Session from "@/models/Session";
import { verifyOTP } from "@/services/otp.service";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/services/token.service";
import { apiResponse } from "@/utils/apiResponse";
import { handleCors, corsHandler } from "@/utils/corsHandler";

export async function POST(req) {
  // Handle CORS preflight
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;
  
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

// Add OPTIONS method to handle preflight requests
export async function OPTIONS(req) {
  const headers = corsHandler(req);
  return new Response(null, {
    status: 200,
    headers,
  });
}
