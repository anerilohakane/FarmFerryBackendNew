import connectDB from "@/lib/connectDB";
import Session from "@/models/Session";
import { apiResponse } from "@/utils/apiResponse";
import { handleCors, corsHandler } from "@/utils/corsHandler";

export async function POST(req) {
  // Handle CORS preflight
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;
  
  await connectDB();

  const { refreshToken } = await req.json();
  await Session.deleteOne({ refreshToken });

  return apiResponse(200, true, "Logged out successfully");
}

// Add OPTIONS method to handle preflight requests
export async function OPTIONS(req) {
  const headers = corsHandler(req);
  return new Response(null, {
    status: 200,
    headers,
  });
}
