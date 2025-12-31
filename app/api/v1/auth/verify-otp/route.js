import connectDB from "@/lib/connectDB";
import Customer from "@/models/Customer";
import Session from "@/models/Session";
import {
  generateAccessToken,
  generateRefreshToken,
} from "@/services/token.service";
import { handleCors, corsHandler } from "@/utils/corsHandler";

export async function POST(req) {
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  await connectDB();

  const { mobile, otp } = await req.json();

  if (!mobile || !otp) {
    return new Response(
      JSON.stringify({ success: false, message: "Mobile and OTP required" }),
      { status: 400 }
    );
  }

  const customer = await Customer.findOne({ phone: mobile });

  if (!customer) {
    return new Response(
      JSON.stringify({ success: false, message: "Customer not found" }),
      { status: 404 }
    );
  }

  if (
    customer.phoneOTP !== otp ||
    customer.phoneOTPExpires < Date.now()
  ) {
    return new Response(
      JSON.stringify({ success: false, message: "Invalid or expired OTP" }),
      { status: 401 }
    );
  }

  customer.isPhoneVerified = true;
  customer.phoneOTP = undefined;
  customer.phoneOTPExpires = undefined;
  customer.lastLogin = new Date();

  await customer.save({ validateBeforeSave: false });

  const accessToken = generateAccessToken(customer);
  const refreshToken = generateRefreshToken(customer);

  await Session.create({
    userId: customer._id,
    refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: "Login successful",
      data: { accessToken, refreshToken, customer },
    }),
    { status: 200 }
  );
}

export async function OPTIONS(req) {
  return new Response(null, { status: 200, headers: corsHandler(req) });
}
