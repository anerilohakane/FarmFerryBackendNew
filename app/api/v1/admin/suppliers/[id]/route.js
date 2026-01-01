import { NextResponse } from 'next/server';
import { dbConnect } from '@/lib/dbConnect';
import Supplier from '@/models/Supplier';
import { requireAuth } from '@/lib/auth';

// GET - Get supplier by ID
export async function GET(req, { params }) {
  try {
    
    await dbConnect();
    
    const { id } = params;
    
    const supplier = await Supplier.findById(id)
      .select("-password -passwordResetToken -passwordResetExpires");
    
    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        success: true,
        data: { supplier },
        message: "Supplier fetched successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Get supplier by ID error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update supplier
export async function PUT(req, { params }) {
  try {
    
    await dbConnect();
    
    const { id } = params;
    const body = await req.json();
    const { status, verificationNotes, ...otherFields } = body;
    
    // If updating status, handle verification
    if (status) {
      return await handleStatusUpdate(id, status, verificationNotes, user.id);
    }
    
    // Regular update
    const allowedFields = [
      "businessName",
      "ownerName",
      "email",
      "phone",
      "businessType",
      "gstNumber",
      "panNumber",
      "address",
      "bankDetails"
    ];
    
    const updateData = {};
    
    for (const field of allowedFields) {
      if (otherFields[field] !== undefined) {
        updateData[field] = otherFields[field];
      }
    }
    
    const updatedSupplier = await Supplier.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).select("-password -passwordResetToken -passwordResetExpires");
    
    if (!updatedSupplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      {
        success: true,
        data: { supplier: updatedSupplier },
        message: "Supplier updated successfully"
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Update supplier error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function for status update
async function handleStatusUpdate(supplierId, status, verificationNotes, adminId) {
  // Validate status
  if (!["pending", "approved", "rejected"].includes(status)) {
    return NextResponse.json(
      { success: false, message: "Invalid status" },
      { status: 400 }
    );
  }
  
  const supplier = await Supplier.findById(supplierId);
  
  if (!supplier) {
    return NextResponse.json(
      { success: false, message: "Supplier not found" },
      { status: 404 }
    );
  }
  
  // Update status
  supplier.status = status;
  
  // Add verification details if approved or rejected
  if (status === "approved") {
    supplier.verifiedAt = new Date();
    supplier.verifiedBy = adminId;
    supplier.verificationNotes = verificationNotes || "Approved by admin";
    
    // Also mark all documents as verified if they exist
    if (supplier.documents && supplier.documents.length > 0) {
      supplier.documents.forEach(doc => {
        doc.isVerified = true;
        doc.verifiedAt = new Date();
        doc.verifiedBy = adminId;
        doc.verificationNotes = "Auto-verified with supplier approval";
      });
    }
  } else if (status === "rejected") {
    supplier.verificationNotes = verificationNotes || "Rejected by admin";
  }
  
  await supplier.save();
  
  return NextResponse.json(
    {
      success: true,
      data: { supplier },
      message: `Supplier ${status} successfully`
    },
    { status: 200 }
  );
}