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
    const { accountName, accountNumber, bankName, ifscCode, branchName } = body;

    // Validate required fields
    if (!accountName || !accountNumber || !bankName || !ifscCode) {
      return NextResponse.json(
        { success: false, message: "Account name, number, bank name, and IFSC code are required" },
        { status: 400 }
      );
    }

    // Update bank details
    supplier.bankDetails = {
      accountHolderName: accountName,
      accountNumber,
      bankName,
      ifscCode,
      branchName: branchName || ""
    };

    await supplier.save();

    return NextResponse.json({
      success: true,
      message: "Bank details updated successfully",
      data: { bankDetails: supplier.bankDetails }
    });

  } catch (error) {
    console.error("Update bank details error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}