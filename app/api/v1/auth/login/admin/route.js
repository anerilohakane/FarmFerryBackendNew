import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Admin from "@/models/Admin";

export async function POST(req) {
  try {
    await dbConnect();
    
    // Parse request body
    const body = await req.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find admin, including password for verification
    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check password
    const isPasswordValid = await admin.isPasswordCorrect(password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate tokens
    const accessToken = admin.generateAccessToken();
    // const refreshToken = admin.generateRefreshToken(); // If needed

    // Remove password from response
    const adminData = admin.toObject();
    delete adminData.password;
    delete adminData.passwordResetToken;
    delete adminData.passwordResetExpires;

    return NextResponse.json(
      {
        success: true,
        data: {
            accessToken,
            admin: adminData
        },
        message: "Login successful"
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Admin Login Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}    
export async function OPTIONS() {
    return NextResponse.json({}, { headers: { 'Allow': 'POST' } });
}
