import connectDB from "@/lib/connectDB";
import jwt from "jsonwebtoken";
import Session from "@/models/Session";
import User from "@/models/User";
import { generateAccessToken } from "@/services/token.service";
import { apiResponse } from "@/utils/apiResponse";

export async function POST(req) {
  await connectDB();

  const { refreshToken } = await req.json();

  const session = await Session.findOne({ refreshToken });
  if (!session) return apiResponse(401, false, "Invalid session");

  const payload = jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET
  );

  const user = await User.findById(payload.userId);
  const newAccessToken = generateAccessToken(user);

  return apiResponse(200, true, "Token refreshed", {
    accessToken: newAccessToken,
  });
}
