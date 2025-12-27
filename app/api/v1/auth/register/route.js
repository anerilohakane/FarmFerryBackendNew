import connectDB from "@/lib/connectDB";
import User from "@/models/User";
import { generateOTP } from "@/services/otp.service";
import { apiResponse } from "../../../../../utils/apiResponse";

export async function POST(req) {
  await connectDB();

  const { mobile, name } = await req.json();

  let user = await User.findOne({ mobile });
  if (!user) {
    user = await User.create({ mobile, name });
  }

  const otp = generateOTP();

  console.log("Dummy OTP:", otp);

  return apiResponse(200, true, "OTP sent successfully");
}
