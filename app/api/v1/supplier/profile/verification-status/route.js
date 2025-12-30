import Supplier from "@/models/Supplier";
import { authenticateSupplier } from "@/middlewares/auth.middleware";
import connectDB from "@/lib/connectDB";
import { NextResponse } from "next/server";

export async function GET(request) {
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

    // Required document types
    const requiredDocs = ['Aadhar Card', 'PAN Card', 'Bank Statement'];

    // Build documents array dynamically
    const documents = requiredDocs.map(type => {
      const doc = supplier.documents?.find(d => d.type === type);
      return {
        type,
        status: doc
          ? doc.isVerified
            ? 'approved'
            : doc.rejectionReason
              ? 'rejected'
              : 'pending'
          : 'not_uploaded',
        url: doc?.url || null,
        rejectionReason: doc?.rejectionReason || null
      };
    });

    // Determine overall verification status based on supplier status first
    let verificationStatus = 'pending';
    
    // Check supplier's overall status first
    if (supplier.status === 'approved') {
      verificationStatus = 'verified';
    } else if (supplier.status === 'rejected') {
      verificationStatus = 'rejected';
    } else {
      // If supplier status is pending, check document status as fallback
      if (documents.every(doc => doc.status === 'approved')) {
        verificationStatus = 'verified';
      } else if (documents.some(doc => doc.status === 'rejected')) {
        verificationStatus = 'rejected';
      }
    }

    // Build steps dynamically
    const steps = [
      { label: 'Upload documents', completed: documents.every(doc => doc.status !== 'not_uploaded') },
      { label: 'Under review', completed: documents.every(doc => doc.status === 'approved' || doc.rejectionReason) },
      { label: 'Verification complete', completed: verificationStatus === 'verified' }
    ];

    return NextResponse.json({
      success: true,
      message: 'Supplier verification status fetched successfully',
      data: {
        verificationStatus,
        documents,
        steps,
        supplierStatus: supplier.status,
        verifiedAt: supplier.verifiedAt,
        verificationNotes: supplier.verificationNotes
      }
    });

  } catch (error) {
    console.error("Verification status error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}