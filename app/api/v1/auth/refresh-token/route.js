import connectDB from "@/lib/connectDB";
import jwt from "jsonwebtoken";
import Session from "@/models/Session";
import User from "@/models/Customer";
import { generateAccessToken } from "@/services/token.service";
import { apiResponse } from "@/utils/apiResponse";
import { handleCors, corsHandler } from "@/utils/corsHandler";

export async function POST(req) {
  // Handle CORS preflight
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;
  
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

// Add OPTIONS method to handle preflight requests
export async function OPTIONS(req) {
  const headers = corsHandler(req);
  return new Response(null, {
    status: 200,
    headers,
  });
}
