import connectDB from "@/lib/connectDB";
import Customer from "@/models/Customer";
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

  const customer = await Customer.findOne({ mobile });
  customer.isVerified = true;
  await customer.save();

  const accessToken = generateAccessToken(customer);
  const refreshToken = generateRefreshToken(customer);

  await Session.create({
    userId: customer._id,
    refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return apiResponse(200, true, "Login successful", {
    accessToken,
    refreshToken,
    customer,
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
