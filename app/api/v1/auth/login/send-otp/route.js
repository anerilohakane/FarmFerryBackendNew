import connectDB from "@/lib/connectDB";
import Customer from "@/models/Customer";
import { generateOTP } from "@/services/otp.service";
import { handleCors, corsHandler } from "@/utils/corsHandler";

export async function POST(req) {
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  await connectDB();

  const body = await req.json();
  const phone = body.phone || body.mobile;

  if (!phone) {
    return new Response(
      JSON.stringify({ success: false, message: "Phone number is required" }),
      { status: 400, headers: corsHandler(req) }
    );
  }

  const otp = generateOTP();
  const otpExpires = Date.now() + 10 * 60 * 1000;

  await Customer.collection.findOneAndUpdate(
    { $or: [{ phone }, { mobile: phone }] },
    {
      $setOnInsert: {
        phone,
        mobile: phone,            // satisfies UNIQUE index
        isPhoneVerified: false,
        createdAt: new Date()
      },
      $set: {
        phoneOTP: otp,
        phoneOTPExpires: otpExpires,
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );

  console.log("OTP (dev):", otp);

  return new Response(
    JSON.stringify({
      success: true,
      message: "OTP sent successfully"
    }),
    { status: 200, headers: corsHandler(req) }
  );
}
