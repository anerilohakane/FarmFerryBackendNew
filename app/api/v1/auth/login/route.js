import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import { generateOTP } from "@/services/otp.service";
import { apiResponse } from "@/utils/apiResponse";

export async function POST(req) {
  await connectDB();

  const { mobile } = await req.json();

  const user = await User.findOne({ mobile });
  if (!user) {
    return apiResponse(404, false, "User not found");
  }

  console.log("Dummy OTP: 123456");

  return apiResponse(200, true, "OTP sent for login");
}
