import connectDB from "@/lib/connectDB";
import Customer from "@/models/Customer";
import { generateOTP } from "@/services/otp.service";
import { handleCors, corsHandler } from "@/utils/corsHandler";



export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: corsHandler(req),
  });
}


export async function POST(req) {
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  try {
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

    console.log(`📱 [SendOTP] Processing for phone: ${phone}, OTP: ${otp}`);

    // Clean phone number (optional)
    // phone = phone.replace(/\D/g, ''); 

    // Clean inputs
    const cleanPhone = String(phone).trim();

    // Explicit 2-step process to ensure data integrity
    let customer = await Customer.findOne({
      $or: [{ phone: cleanPhone }, { mobile: cleanPhone }]
    });

    if (customer) {
      console.log(`✅ [SendOTP] Found existing customer: ${customer._id}`);
      customer.phoneOTP = otp;
      customer.phoneOTPExpires = otpExpires;
      // Ensure mobile field is populated for future lookups
      if (!customer.mobile) customer.mobile = cleanPhone;

      await customer.save();
      console.log(`✅ [SendOTP] Updated OTP for ${customer._id}`);
    } else {
      console.log(`🆕 [SendOTP] Creating new customer for ${cleanPhone}`);
      customer = await Customer.create({
        phone: cleanPhone,
        mobile: cleanPhone,
        role: "customer",
        isPhoneVerified: false,
        phoneOTP: otp,
        phoneOTPExpires: otpExpires
      });
      console.log(`✅ [SendOTP] Created new customer: ${customer._id}`);
    }

    console.log("OTP (dev):", otp);

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully"
      }),
      { status: 200, headers: corsHandler(req) }
    );
  } catch (error) {
    console.error("OTP Send Error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Server Error" }),
      { status: 500, headers: corsHandler(req) }
    );
  }
}
