
import { NextResponse } from "next/server";
import DeliveryAssociate from "@/models/DeliveryAssociate";
import dbConnect from "@/lib/connectDB";

export async function POST(req) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    // 1. Find User
    const associate = await DeliveryAssociate.findOne({ email });
    if (!associate) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 2. Verify Password
    const isMatch = await associate.isPasswordCorrect(password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 3. Generate Tokens
    const accessToken = associate.generateAccessToken();
    const refreshToken = associate.generateRefreshToken();

    // 4. Update Last Login
    associate.lastLogin = new Date();
    await associate.save({ validateBeforeSave: false });

    // 5. Response
    const userForResponse = associate.toObject();
    delete userForResponse.password;
    delete userForResponse.passwordResetToken;

    return NextResponse.json({
      success: true,
      message: "Login successful",
      data: {
        user: userForResponse,
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error("Delivery Login Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
