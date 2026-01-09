
import { NextResponse } from "next/server";
import DeliveryAssociate from "@/models/DeliveryAssociate";
import dbConnect from "@/lib/connectDB";

export async function POST(req) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { 
      name, 
      email, 
      password, 
      phone, 
      address, // Object: { street, city, state, postalCode, country }
      vehicle  // Object: { type, model, registrationNumber, color }
    } = body;

    // 1. Validation
    if (!name || !email || !password || !address || !vehicle) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // 2. Check if already exists
    const existingUser = await DeliveryAssociate.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email already registered" },
        { status: 409 }
      );
    }

    // 3. Create Associate
    const newAssociate = await DeliveryAssociate.create({
      name,
      email,
      password,
      phone,
      address,
      vehicle,
      role: "deliveryAssociate",
      isVerified: false, // Default pending verification
      isActive: true
    });

    // 4. Generate Token (Auto-login)
    const accessToken = newAssociate.generateAccessToken();
    const refreshToken = newAssociate.generateRefreshToken();

    // 5. Response
    const userForResponse = newAssociate.toObject();
    delete userForResponse.password;
    delete userForResponse.passwordResetToken;

    return NextResponse.json({
      success: true,
      message: "Delivery Associate registered successfully",
      data: {
        user: userForResponse,
        accessToken,
        refreshToken
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Delivery Registration Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
