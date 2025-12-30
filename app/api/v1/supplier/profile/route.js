import Supplier from "@/models/Supplier";
import Order from "@/models/Order";
import { authenticateSupplier } from "@/middlewares/auth.middleware";
import connectDB from "@/lib/connectDB";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await connectDB();
    
    // Get token from headers
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

    // Count total orders
    const totalOrders = await Order.countDocuments({ 
      supplier: new mongoose.Types.ObjectId(supplier._id) 
    });

    // Convert supplier to object and add totalOrders
    const supplierObj = supplier.toObject();
    supplierObj.totalOrders = totalOrders;
    
    return NextResponse.json({
      success: true,
      message: "Supplier profile fetched successfully",
      data: { supplier: supplierObj }
    });

  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

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
      businessName, 
      ownerName, 
      phone, 
      businessType,
      description,
      gstNumber,
      panNumber
    } = body;
    
    const updateFields = {};
    
    if (businessName) updateFields.businessName = businessName;
    if (ownerName) updateFields.ownerName = ownerName;
    if (phone) updateFields.phone = phone;
    if (businessType) updateFields.businessType = businessType;
    if (description) updateFields.description = description;
    if (gstNumber) updateFields.gstNumber = gstNumber;
    if (panNumber) updateFields.panNumber = panNumber;
    
    const updatedSupplier = await Supplier.findByIdAndUpdate(
      supplier._id,
      { $set: updateFields },
      { new: true }
    ).select("-password -passwordResetToken -passwordResetExpires");
    
    if (!updatedSupplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Supplier profile updated successfully",
      data: { supplier: updatedSupplier }
    });

  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}