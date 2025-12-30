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