import { NextResponse } from "next/server";
import { authenticateDeliveryAssociate } from "@/middlewares/auth.middleware";
import dbConnect from "@/lib/connectDB";

export async function GET(req) {
  try {
    await dbConnect();

    // Authenticate
    const authResult = await authenticateDeliveryAssociate(req);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.statusCode }
      );
    }
    
    // Return user profile
    return NextResponse.json({
      success: true,
      data: authResult.user
    });

  } catch (error) {
    console.error("Fetch Profile Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
