import connectDB from "@/lib/connectDB";
import Session from "@/models/Session";
import { apiResponse } from "@/utils/apiResponse";

export async function POST(req) {
  await connectDB();

  const { refreshToken } = await req.json();
  await Session.deleteOne({ refreshToken });

  return apiResponse(200, true, "Logged out successfully");
}
