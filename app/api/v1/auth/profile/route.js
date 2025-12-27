import { authMiddleware } from "@/middlewares/auth.middleware";
import { apiResponse } from "@/utils/apiResponse";
import { handleCors, corsHandler } from "@/utils/corsHandler";

export async function GET(req) {
  // Handle CORS preflight
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;
  
  const { user, error } = await authMiddleware(req);

  if (error) {
    return apiResponse(401, false, error);
  }

  return apiResponse(200, true, "User profile fetched", user);
}

// Add OPTIONS method to handle preflight requests
export async function OPTIONS(req) {
  const headers = corsHandler(req);
  return new Response(null, {
    status: 200,
    headers,
  });
}
