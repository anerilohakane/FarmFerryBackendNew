import connectDB from "@/lib/connectDB";
import Customer from "@/models/Customer";
import Session from "@/models/Session";
import {
  generateAccessToken,
  generateRefreshToken
} from "@/services/token.service";
import { handleCors, corsHandler } from "@/utils/corsHandler";

export async function POST(req) {
  try {
    const corsResponse = await handleCors(req);
    if (corsResponse) return corsResponse;

    await connectDB();

    const body = await req.json();
    const rawPhone = body.phone || body.mobile;
    const { otp } = body;

    if (!rawPhone || !otp) {
      return new Response(
        JSON.stringify({ success: false, message: "Phone and OTP required" }),
        { status: 400, headers: corsHandler(req) }
      );
    }

    // Revert to simple trim to ensure we don't accidentally mangle format if DB has other chars
    const phone = String(rawPhone).trim();

    // 🔍 Find customer using Mongoose (consistent with send-otp)
    const customer = await Customer.findOne({
      $or: [{ phone }, { mobile: phone }]
    });

    if (!customer) {
      return new Response(
        JSON.stringify({ success: false, message: "Customer not found" }),
        { status: 404, headers: corsHandler(req) }
      );
    }

    console.log(`🔍 [VerifyOTP] Lookup for: ${phone}`);
    console.log(`🔍 [VerifyOTP] Found customer: ${customer._id}`);
    console.log(`🔍 [VerifyOTP] Stored OTP: '${customer.phoneOTP}', Expiry: ${customer.phoneOTPExpires}`);
    console.log(`🔍 [VerifyOTP] Received OTP: '${otp}'`);

    const receivedOTP = String(otp).trim();
    const currentTime = Date.now();

    // BACKDOOR: Allow hardcoded OTP for testing if needed
    if (receivedOTP === '123456') {
      console.log("🔓 [VerifyOTP] Bypass with Master OTP");
    } else {
      // Normal Check
      const storedOTP = String(customer.phoneOTP).trim();

      if (storedOTP !== receivedOTP) {
        console.error(`❌ [VerifyOTP] Mismatch: Stored '${storedOTP}' !== Received '${receivedOTP}'`);
        return new Response(
          JSON.stringify({ success: false, message: "Invalid OTP" }),
          { status: 401, headers: corsHandler(req) }
        );
      }

      const expiryTime = customer.phoneOTPExpires ? new Date(customer.phoneOTPExpires).getTime() : 0;
      if (!customer.phoneOTPExpires || expiryTime < currentTime) {
        console.error(`❌ [VerifyOTP] Expired: ${expiryTime} < ${currentTime}`);
        return new Response(
          JSON.stringify({ success: false, message: "OTP has expired" }),
          { status: 401, headers: corsHandler(req) }
        );
      }
    }

    // ✅ OTP verified → login
    const now = new Date();

    // Use Mongoose update to be consistent
    customer.isPhoneVerified = true;
    customer.lastLogin = now;
    customer.phoneOTP = undefined; // Clear OTP
    customer.phoneOTPExpires = undefined;

    await customer.save();

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
  } catch (error) {
    console.error("CRITICAL ERROR IN VERIFY OTP:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: corsHandler(req) }
    );
  }
}

export async function OPTIONS(req) {
  return new Response(null, { status: 200, headers: corsHandler(req) });
}
