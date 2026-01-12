// import Supplier from "@/models/Supplier";
// import { NextResponse } from "next/server";
// import connectDB from "@/lib/connectDB";

import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Supplier from "@/models/Supplier";
import bcrypt from "bcryptjs";


export async function POST(request) {
  try {
    // Connect to database
    await dbConnect();

    // Parse request body
    const body = await request.json();
    const { ownerName, email, phone, businessName, password } = body;

    // Validate required fields
    if (!ownerName || !email || !phone || !businessName || !password) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Owner name, email, phone, business name, and password are required",
        },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    // Check for existing email
    const existingSupplierByEmail = await Supplier.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingSupplierByEmail) {
      return NextResponse.json(
        { success: false, message: "Email is already registered" },
        { status: 409 }
      );
    }

    // Check for existing phone
    const existingSupplierByPhone = await Supplier.findOne({
      phone: phone.trim(),
    });

    if (existingSupplierByPhone) {
      return NextResponse.json(
        { success: false, message: "Phone number is already registered" },
        { status: 409 }
      );
    }

    // Create new supplier (password will be hashed by pre-save hook)
    const supplier = new Supplier({
      ownerName: ownerName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      businessName: businessName.trim(),
      password: password, 
      role: "supplier",
      status: "pending",
      lastLogin: new Date(),
    });

    // Save supplier
    await supplier.save();

    // Generate tokens
    const accessToken = supplier.generateAccessToken();
    const refreshToken = supplier.generateRefreshToken();

    // Prepare response (remove sensitive data)
    const createdSupplier = {
      _id: supplier._id,
      ownerName: supplier.ownerName,
      email: supplier.email,
      phone: supplier.phone,
      businessName: supplier.businessName,
      role: supplier.role,
      status: supplier.status,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Supplier registered successfully",
        data: {
          user: createdSupplier,
          accessToken,
          refreshToken
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);

    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error.name === "ValidationError") {
      statusCode = 400;
      errorMessage = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
    } else if (error.code === 11000) {
      statusCode = 409;
      errorMessage = "Duplicate key error";
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
      },
      { status: statusCode }
    );
  }
}



export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
