import connectDB from "@/lib/connectDB";
import Customer from "@/models/Customer";
import { handleCors, corsHandler } from "@/utils/corsHandler";

const STATIC_OTP = "123456";

export async function POST(req) {
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;

  await connectDB();

  const { mobile } = await req.json();

  if (!mobile) {
    return new Response(
      JSON.stringify({ success: false, message: "Mobile is required" }),
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

  customer.phoneOTP = STATIC_OTP;
  customer.phoneOTPExpires = Date.now() + 10 * 60 * 1000;
  await customer.save({ validateBeforeSave: false });

  console.log(`OTP for ${mobile}: ${STATIC_OTP}`);

  return new Response(
    JSON.stringify({ success: true, message: "OTP sent successfully" }),
    { status: 200 }
  );
}

export async function OPTIONS(req) {
  return new Response(null, { status: 200, headers: corsHandler(req) });
}
