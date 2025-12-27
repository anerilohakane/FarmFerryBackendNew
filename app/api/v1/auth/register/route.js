import connectDB from "@/lib/connectDB";
import Customer from "@/models/Customer";
import { generateOTP } from "@/services/otp.service";
import { apiResponse } from "@/utils/apiResponse";
import { handleCors, corsHandler } from "@/utils/corsHandler";

export async function POST(req) {
  // Handle CORS preflight
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;
  
  await connectDB();

  const { mobile, name } = await req.json();

  let customer = await Customer.findOne({ mobile });
  if (!customer) {
    customer = await Customer.create({ mobile, name });
  }

  const otp = generateOTP();

  console.log("Dummy OTP:", otp);

  return apiResponse(200, true, "OTP sent successfully");
}

// Add OPTIONS method to handle preflight requests
export async function OPTIONS(req) {
  const headers = corsHandler(req);
  return new Response(null, {
    status: 200,
    headers,
  });
}
