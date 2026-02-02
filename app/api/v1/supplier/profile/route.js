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

    // ✅ ADDRESS SUPPORT
    if (body.address) {
      // If address is provided, we merge it carefully or replace it
      // For simplicity in a "Complete Profile Update", we often replace the sub-object
      // But let's check if we should merge.
      // Given Schema structure: address: { street, city... }
      // It's safer to allow partial updates if we were doing patch, but this is partial update of the supplier.
      // We will accept the full address object or partial fields if the client sends them in an object.
      // However, to avoid overwriting with nulls, we only set if provided.
      // The easiest way for a "complete api" is to allow the user to send an address object.

      const { street, city, state, postalCode, country, landmark, coordinates } = body.address;

      // We construct the address object ensuring we don't lose data if we only want to update some fields,
      // BUT existing logic in sub-routes suggests full replacement or specific field updates.
      // To work with $set and dot notation for nested fields is complex if not flattening.
      // So we will replace the address object if provided, but maybe we should use dot notation?
      // Mongoose $set: { "address.street": ... } works best.

      if (street) updateFields["address.street"] = street;
      if (city) updateFields["address.city"] = city;
      if (state) updateFields["address.state"] = state;
      if (postalCode) updateFields["address.postalCode"] = postalCode;
      if (country) updateFields["address.country"] = country;
      if (landmark) updateFields["address.landmark"] = landmark;
      // Coordinates might be an object
      if (coordinates) updateFields["address.coordinates"] = coordinates;
    }

    // ✅ BANK DETAILS SUPPORT
    if (body.bankDetails) {
      const { accountHolderName, bankName, accountNumber, ifscCode, branchName } = body.bankDetails;
      if (accountHolderName) updateFields["bankDetails.accountHolderName"] = accountHolderName;
      if (bankName) updateFields["bankDetails.bankName"] = bankName;
      if (accountNumber) updateFields["bankDetails.accountNumber"] = accountNumber;
      if (ifscCode) updateFields["bankDetails.ifscCode"] = ifscCode;
      if (branchName) updateFields["bankDetails.branchName"] = branchName;
    }

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