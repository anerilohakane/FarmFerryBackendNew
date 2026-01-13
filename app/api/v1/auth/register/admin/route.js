import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Admin from '@/models/Admin';
import { handleCors, corsHandler } from '@/utils/corsHandler';

export async function POST(req) {
     const corsResponse = await handleCors(req);
     if (corsResponse) return corsResponse;

  try {
    await dbConnect();

    const body = await req.json();
    const { firstName, lastName, email, password, phone, secretKey } = body;

    // Optional: Secret key protection to prevent public registration
    // For now, we'll allow it as per user request, but usually this should be protected.
    // if (secretKey !== process.env.ADMIN_REGISTER_SECRET) {
    //    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    // }

    if (!firstName || !email || !password) {
      return NextResponse.json(
        { success: false, message: "First name, email, and password are required" },
        { status: 400 }
      );
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return NextResponse.json(
        { success: false, message: "Admin with this email already exists" },
        { status: 409 }
      );
    }

    // Create new admin
    const newAdmin = await Admin.create({
      name: {
        firstName,
        lastName
      },
      email,
      password, // Pre-save hook will hash this
      phone,
      role: 'admin',
      permissions: { // Default permissions
        manageCustomers: true,
        manageSuppliers: true,
        manageProducts: true,
        manageOrders: true,
        manageCategories: true,
        viewAnalytics: true
      }
    });

    // Generate token immediately for auto-login
    const accessToken = newAdmin.generateAccessToken();

    // Hide password in response
    const adminResponse = newAdmin.toObject();
    delete adminResponse.password;

    return NextResponse.json(
      {
        success: true,
        message: "Admin registered successfully",
        data: {
            admin: adminResponse,
            accessToken
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Admin registration error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: corsHandler(req),
  });
}
