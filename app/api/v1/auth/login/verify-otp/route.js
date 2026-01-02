import connectDB from "@/lib/connectDB";
import Customer from "@/models/Customer";
import Session from "@/models/Session";
import {
  generateAccessToken,
  generateRefreshToken
} from "@/services/token.service";
import { handleCors, corsHandler } from "@/utils/corsHandler";

export async function POST(req) {
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  await connectDB();

  const body = await req.json();
  const phone = body.phone || body.mobile;
  const { otp } = body;

  if (!phone || !otp) {
    return new Response(
      JSON.stringify({ success: false, message: "Phone and OTP required" }),
      { status: 400, headers: corsHandler(req) }
    );
  }

  // 🔍 Find customer using native query (mobile-safe)
  const customer = await Customer.collection.findOne({
    $or: [{ phone }, { mobile: phone }]
  });

  if (!customer) {
    return new Response(
      JSON.stringify({ success: false, message: "Customer not found" }),
      { status: 404, headers: corsHandler(req) }
    );
  }

  if (
    customer.phoneOTP !== otp ||
    !customer.phoneOTPExpires ||
    customer.phoneOTPExpires < Date.now()
  ) {
    return new Response(
      JSON.stringify({ success: false, message: "Invalid or expired OTP" }),
      { status: 401, headers: corsHandler(req) }
    );
  }

  // ✅ OTP verified → login
  const now = new Date();

  await Customer.collection.updateOne(
    { _id: customer._id },
    {
      $set: {
        isPhoneVerified: true,
        lastLogin: now,
        updatedAt: now
      },
      $unset: {
        phoneOTP: "",
        phoneOTPExpires: ""
      }
    }
  );

  // 🔑 Generate tokens
  const accessToken = generateAccessToken(customer);
  const refreshToken = generateRefreshToken(customer);

  // 🧾 Store session
  await Session.create({
    userId: customer._id,
    refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        refreshToken,
        customer: {
          _id: customer._id,
          phone: customer.phone,
          role: customer.role,
          isPhoneVerified: true
        }
      }
    }),
    { status: 200, headers: corsHandler(req) }
  );
}

export async function OPTIONS(req) {
  return new Response(null, { status: 200, headers: corsHandler(req) });
}
