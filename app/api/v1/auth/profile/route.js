import { authMiddleware } from "@/middlewares/auth.middleware";
import { apiResponse } from "@/utils/apiResponse";

export async function GET(req) {
  const { user, error } = await authMiddleware(req);

  if (error) {
    return apiResponse(401, false, error);
  }

  return apiResponse(200, true, "User profile fetched", user);
}
