import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Category from "@/models/Category";
import Product from "@/models/Product";
import Notification from "@/models/Notification";
import { authenticate } from "@/middlewares/auth.middleware"; // Generic auth
import cloudinary from "@/lib/cloudinary";

function isValidObjectIdString(id) {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
}

// GET SINGLE
export async function GET(request, { params }) {
  await dbConnect();
  try {
      const { id } = await params;
      const product = await Product.findById(id).populate('categoryId').populate('supplierId');
      if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: product });
  } catch (err) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// UPDATE (PUT/PATCH merged logic for simplicity)
export async function PATCH(request, { params }) {
    await dbConnect();
    const { id } = await params;

    // Auth
    const authResult = await authenticate(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    const { user, role } = authResult;
    
    if (!['admin', 'superadmin', 'supplier'].includes(role)) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    try {
        let updateData = {};
        
        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            updateData = {
                name: formData.get('name'),
                description: formData.get('description'),
                price: formData.has('price') ? parseFloat(formData.get('price')) : undefined,
                stockQuantity: formData.has('stockQuantity') ? parseInt(formData.get('stockQuantity')) : undefined,
                categoryId: formData.get('categoryId'),
                isActive: formData.has('status') ? formData.get('status') === 'Active' : undefined
            };
            
            // Remove undefined
            Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
            
            // Images
            const newFiles = formData.getAll('images');
            if (newFiles && newFiles.length > 0 && typeof newFiles[0] !== 'string') {
                 const uploadedImages = [];
                 for (const file of newFiles) {
                    const arrayBuffer = await file.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
                     const uploadRes = await new Promise((resolve, reject) => {
                         cloudinary.uploader.upload(base64, { folder: "products", resource_type: "image" }, (e, r) => e ? reject(e) : resolve(r));
                     });
                     uploadedImages.push({ url: uploadRes.secure_url, publicId: uploadRes.public_id, isMain: uploadedImages.length === 0 });
                 }
                 updateData.images = uploadedImages;
            }
        } else {
            updateData = await request.json();
            // Secure fields if Supplier
            if (role === 'supplier') {
               delete updateData.supplierId; // Cannot change owner
            }
        }
        
        // Check ownership if Supplier
        if (role === 'supplier') {
            const prod = await Product.findById(id);
            if (!prod) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
            if (String(prod.supplierId) !== String(user._id)) {
                return NextResponse.json({ success: false, error: "Unauthorized access to this product" }, { status: 403 });
            }
        }

        const updated = await Product.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!updated) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
        
        return NextResponse.json({ success: true, data: updated });
        
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    await dbConnect();
    const { id } = await params;
    
    // Auth
    const authResult = await authenticate(request);
    if (!authResult.success) return NextResponse.json({ success: false, error: authResult.error }, { status: authResult.statusCode });
    const { user, role } = authResult;

    if (!['admin', 'superadmin', 'supplier'].includes(role)) {
         return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    try {
        if (role === 'supplier') {
            const prod = await Product.findById(id);
            if (!prod) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
            if (String(prod.supplierId) !== String(user._id)) {
                return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
            }
        }
        
        const deleted = await Product.findByIdAndDelete(id);
        if (!deleted) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
        
        return NextResponse.json({ success: true, message: "Deleted" });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
