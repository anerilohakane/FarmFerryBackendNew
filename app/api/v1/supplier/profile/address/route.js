import Supplier from "@/models/Supplier";
import { authenticateSupplier } from "@/middlewares/auth.middleware";
import connectDB from "@/lib/connectDB";
import { NextResponse } from "next/server";

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