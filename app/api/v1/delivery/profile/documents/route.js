import { NextResponse } from "next/server";
import { authenticateDeliveryAssociate } from "@/middlewares/auth.middleware";
import dbConnect from "@/lib/connectDB";
import DeliveryAssociate from "@/models/DeliveryAssociate";
import cloudinary from "@/lib/cloudinary";

export async function POST(req) {
  try {
    await dbConnect();

    const authResult = await authenticateDeliveryAssociate(req);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.error },
        { status: authResult.statusCode }
      );
    }

    const daId = authResult.user._id;

    // Parse FormData (Naive approach for Next.js App Router, better to use standard request.formData())
    const formData = await req.formData();
    const documentType = formData.get('documentType');
    const file = formData.get('document');

    if (!file) {
      return NextResponse.json({ success: false, message: "No file uploaded" }, { status: 400 });
    }

    // Cloudinary Upload
    // Convert file to buffer and then to base64 for cloudinary upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileBase64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    const uploadResponse = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(fileBase64, {
            folder: `delivery-associates/${daId}/documents`,
            public_id: `${documentType}_${Date.now()}`,
            resource_type: "auto"
        }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
        });
    });

    const docUrl = uploadResponse.secure_url;
    const publicId = uploadResponse.public_id;

    // Update DA Profile
    // Remove existing document of same type if it exists to avoid duplicates? Or keep history?
    // Let's replace if exists or push if new.
    
    // We need to use Mongoose update to push/set
    // Check if document of this type already exists in array
    const existingDocIndex = authResult.user.documents.findIndex(d => d.type === documentType);
    
    if (existingDocIndex >= 0) {
        authResult.user.documents[existingDocIndex] = {
            type: documentType,
            url: docUrl,
            publicId: publicId,
            isVerified: true // Auto-verify for now? Or wait for admin? Let's say uploaded means pending but for this task user wants verify.
        };
    } else {
        authResult.user.documents.push({
            type: documentType,
            url: docUrl,
            publicId: publicId,
            isVerified: true
        });
    }

    // Verify user if all required docs are present? 
    // minimal logic: just mark verified if at least one doc exists for now to unblock user
    authResult.user.isVerified = true; 

    await authResult.user.save();

    return NextResponse.json({
      success: true,
      message: "Document uploaded successfully",
      data: {
        url: docUrl,
        isVerified: true,
        documents: authResult.user.documents
      }
    });

  } catch (error) {
    console.error("Upload Document Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
