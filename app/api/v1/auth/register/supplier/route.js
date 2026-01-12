import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Supplier from '@/models/Supplier';

export async function POST(req) {
  try {
    await dbConnect();

    const body = await req.json();
    const { businessName, ownerName, email, phone, status, address, password } = body;

    // Basic Validation
    if (!businessName || !ownerName || !email || !phone || !password) {
      return NextResponse.json(
        { success: false, message: "Business name, owner name, email, phone, and password are required" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await Supplier.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Supplier with this email already exists" },
        { status: 409 }
      );
    }

    // Create supplier
    // Password hashing is handled by the model's pre('save') hook
    const supplier = await Supplier.create({
      businessName,
      ownerName,
      email,
      phone,
      status: status || "pending",
      address: address || {},
      password
    });

    // Return response (excluding sensitive fields)
    const supplierResponse = supplier.toObject();
    delete supplierResponse.password;
    delete supplierResponse.passwordResetToken;
    delete supplierResponse.passwordResetExpires;

    return NextResponse.json(
      {
        success: true,
        data: { supplier: supplierResponse },
        message: "Supplier registered successfully"
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Register supplier error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
