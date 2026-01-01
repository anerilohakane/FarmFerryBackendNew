// import { apiResponse } from "@/utils/apiResponse";
import { handleCors, corsHandler } from "@/utils/corsHandler";
import { authenticate } from "@/middlewares/auth.middleware";

export async function GET(req) {
  // Handle CORS preflight
  const corsResponse = await handleCors(req);
  if (corsResponse) return corsResponse;
  
  const { customer, error } = await authMiddleware(req);

  if (error) {
    return apiResponse(401, false, error);
  }

  return apiResponse(200, true, "Customer profile fetched", customer);
}

// Add OPTIONS method to handle preflight requests
export async function OPTIONS(req) {
  const headers = corsHandler(req);
  return new Response(null, {
    status: 200,
    headers,
  });
}
