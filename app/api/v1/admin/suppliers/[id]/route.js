import { NextResponse } from 'next/server';
import dbConnect from '@/lib/connectDB';
import Supplier from '@/models/Supplier';
// import { requireAuth } from '@/lib/auth';

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
    
    // If updating status, handle verification (assuming handleStatusUpdate is defined elsewhere or below)
    // Note: handleStatusUpdate likely calls save() so hooks run there too.
    if (status) {
      return await handleStatusUpdate(id, status, verificationNotes); // Removed user.id as it wasn't defined in scope
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
      "bankDetails",
      "password" // ✅ Added password
    ];
    
    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found" },
        { status: 404 }
      );
    }
    
    // Update allowed fields
    for (const field of allowedFields) {
      if (otherFields[field] !== undefined && otherFields[field] !== '') {
        // Simple update for top-level fields
        supplier[field] = otherFields[field];
      }
    }

    // Explicitly handle address and bankDetails merging if needed, 
    // or just assume full object replacement if simpler.
    // The previous loop handles top-level replacement which works for mismatched schemas usually 
    // but deeper merge might be safer. For now adhering to previous logic but enabling hooks.

    // Triggers pre-save hook (hashing password)
    const updatedSupplier = await supplier.save();
    
    // Return without password
    const responseSupplier = updatedSupplier.toObject();
    delete responseSupplier.password;
    delete responseSupplier.passwordResetToken;
    delete responseSupplier.passwordResetExpires;

    return NextResponse.json(
      {
        success: true,
        data: { supplier: responseSupplier },
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