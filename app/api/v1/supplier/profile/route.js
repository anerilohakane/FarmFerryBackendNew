import Supplier from "@/models/Supplier";
import Order from "@/models/Order";
import { authenticateSupplier } from "@/middlewares/auth.middleware";
import connectDB from "@/lib/connectDB";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    await connectDB();

    const authResult = await authenticateSupplier(request);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const supplier = authResult.user;

    const totalOrders = await Order.countDocuments({
      supplier: supplier._id
    });

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

    /* ------------------ AUTH ------------------ */
    const authResult = await authenticateSupplier(request);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const supplier = authResult.user;

    /* ------------------ BODY ------------------ */
    const body = await request.json();

    const {
      businessName,
      ownerName,
      phone,
      businessType,
      description,
      gstNumber,
      panNumber,
      documents
    } = body;

    /* ------------------ SECURITY ------------------ */
    if (body.email) {
      return NextResponse.json(
        { success: false, message: "Email cannot be updated" },
        { status: 400 }
      );
    }

    /* ------------------ BUILD UPDATE OBJECT ------------------ */
    const updateFields = {};

    if (businessName) updateFields.businessName = businessName;
    if (ownerName) updateFields.ownerName = ownerName;
    if (phone) updateFields.phone = phone;
    if (businessType) updateFields.businessType = businessType;
    if (description) updateFields.description = description;
    if (gstNumber) updateFields.gstNumber = gstNumber;
    if (panNumber) updateFields.panNumber = panNumber;

    // ✅ DOCUMENTS SUPPORT
    if (Array.isArray(documents)) {
      updateFields.documents = documents;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    /* ------------------ UPDATE ------------------ */
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

    /* ------------------ RESPONSE ------------------ */
    return NextResponse.json({
      success: true,
      message: "Supplier profile updated successfully",
      data: { supplier: updatedSupplier }
    });

  } catch (error) {
    console.error("❌ Supplier profile update error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}