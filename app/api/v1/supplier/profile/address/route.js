import Supplier from "@/models/Supplier";
import { authenticateSupplier } from "@/middlewares/auth.middleware";
import connectDB from "@/lib/connectDB";
import { NextResponse } from "next/server";

export async function PUT(request) {
  try {
    await connectDB();
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const supplier = await authenticateSupplier(token);
    
    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      street, 
      city, 
      state, 
      postalCode, 
      country, 
      landmark,
      coordinates 
    } = body;
    
    if (!street || !city || !state || !postalCode || !country) {
      return NextResponse.json(
        { success: false, message: "All address fields are required" },
        { status: 400 }
      );
    }
    
    // Update address
    supplier.address = {
      street,
      city,
      state,
      postalCode,
      country,
      landmark: landmark || "",
      coordinates: coordinates || {}
    };
    
    await supplier.save();
    
    const updatedSupplier = await Supplier.findById(supplier._id).select("-password -passwordResetToken -passwordResetExpires");
    
    return NextResponse.json({
      success: true,
      message: "Address updated successfully",
      data: { supplier: updatedSupplier }
    });

  } catch (error) {
    console.error("Update address error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}