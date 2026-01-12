import { NextResponse } from "next/server";
import dbConnect from "@/lib/connectDB";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { authenticate, requireRole } from "@/middlewares/auth.middleware";

// Helper to check for circular dependency
async function isCircularQuery(targetId, newParentId) {
    if (targetId === newParentId) return true;

    let currentParentId = newParentId;
    while (currentParentId) {
        const parent = await Category.findById(currentParentId);
        if (!parent || !parent.parent) break;
        if (parent.parent.toString() === targetId) return true;
        currentParentId = parent.parent.toString();
    }
    return false;
}

// GET Single Category
export async function GET(request, { params }) {
    await dbConnect();
    const { id } = params;

    try {
        const category = await Category.findById(id).populate('parent', 'name');
        if (!category) {
            return NextResponse.json(
                { success: false, error: "Category not found" },
                { status: 404 }
            );
        }
        return NextResponse.json({ success: true, data: category });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
    await dbConnect();
    const { id } = params;

    const authCheck = await requireRole(["admin", "superadmin"])(request);
    if (!authCheck.success) {
        return NextResponse.json(
            { success: false, error: authCheck.error },
            { status: authCheck.statusCode }
        );
    }

    try {
        const formData = await request.formData();
        
        const name = formData.get('name');
        const description = formData.get('description');
        // Handle isActive explicitly. Frontend sends string "true"/"false" or boolean
        const isActiveRaw = formData.get('isActive');
        const isActive = isActiveRaw === 'true' || isActiveRaw === true;
        
        const parent = formData.get('parent');
        const imageFile = formData.get('image');
        const handlingFee = formData.get('handlingFee');

        const updateData = {};
        if (name) updateData.name = name;
        if (description !== null) updateData.description = description; // Allow clearing? Or just update if present. description is optional.
        if (isActiveRaw !== null) updateData.isActive = isActive;
        if (handlingFee !== null) updateData.handlingFee = parseFloat(handlingFee);
        
        // Handle parent
        if (parent && parent !== 'null' && parent !== 'undefined') {
            // Check for circular dependency
            if (id === parent) {
                return NextResponse.json(
                    { success: false, error: "Category cannot be its own parent" },
                    { status: 400 }
                );
            }
            const isCircular = await isCircularQuery(id, parent);
            if (isCircular) {
                return NextResponse.json(
                    { success: false, error: "Circular dependency detected" },
                    { status: 400 }
                );
            }

            const parentCat = await Category.findById(parent);
            if (!parentCat) {
                return NextResponse.json({ success: false, error: "Parent category not found" }, { status: 400 });
            }
            updateData.parent = parent;
        } else if (parent === 'null' || parent === null) {
            updateData.parent = null; // Clear parent if specifically requested
        }

        // Image Upload
        if (imageFile && typeof imageFile !== 'string') {
             const arrayBuffer = await imageFile.arrayBuffer();
             const buffer = Buffer.from(arrayBuffer);
             const fileBase64 = `data:${imageFile.type};base64,${buffer.toString('base64')}`;

             const uploadResponse = await new Promise((resolve, reject) => {
                 cloudinary.uploader.upload(fileBase64, {
                     folder: "categories",
                     resource_type: "image"
                 }, (error, result) => {
                     if (error) reject(error);
                     else resolve(result);
                 });
             });
             updateData.image = {
                 url: uploadResponse.secure_url,
                 publicId: uploadResponse.public_id
             };
        }

        const category = await Category.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!category) {
            return NextResponse.json(
                { success: false, error: "Category not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, data: category },
            { status: 200 }
        );
    } catch (error) {
        console.error("PUT /api/v1/category/[id] error:", error);
        if (error.code === 11000) {
            return NextResponse.json(
                { success: false, error: "Category name already exists" },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request, { params }) {
    await dbConnect();

    const authCheck = await requireRole(["admin", "superadmin"])(request);
    if (!authCheck.success) {
        return NextResponse.json(
            { success: false, error: authCheck.error },
            { status: authCheck.statusCode }
        );
    }

    try {
        const { id } = params;

        // 1. Check if category exists
        const category = await Category.findById(id);
        if (!category) {
            return NextResponse.json(
                { success: false, error: "Category not found" },
                { status: 404 }
            );
        }

        // 2. Check for dependencies (Subcategories)
        const subcats = await Category.countDocuments({ parent: id });
        if (subcats > 0) {
            return NextResponse.json(
                { success: false, error: `Cannot delete: This category has ${subcats} subcategories.` },
                { status: 400 }
            );
        }

        // 3. Check for dependencies (Products)
        const products = await Product.countDocuments({ categoryId: id });
        if (products > 0) {
            return NextResponse.json(
                { success: false, error: `Cannot delete: This category has ${products} products associated with it.` },
                { status: 400 }
            );
        }

        // 4. Delete
        await Category.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: "Category deleted successfully"
        });

    } catch (error) {
        console.error("DELETE category error:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
