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

  const { mobile } = await req.json();

  const customer = await Customer.findOne({ mobile });
  if (!customer) {
    return apiResponse(404, false, "Customer not found");
  }

  console.log("Dummy OTP: 123456");

  return apiResponse(200, true, "OTP sent for login");
}

// Add OPTIONS method to handle preflight requests
export async function OPTIONS(req) {
  const headers = corsHandler(req);
  return new Response(null, {
    status: 200,
    headers,
  });
}
